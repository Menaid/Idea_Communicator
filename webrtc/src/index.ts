import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import Redis from 'ioredis';
import * as mediasoup from 'mediasoup';
import { config } from './config';
import { logger } from './lib/logger';
import { RoomManager } from './lib/RoomManager';

const app = express();
const httpServer = createServer(app);

// Socket.IO setup
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
});

// Redis client for pub/sub and state management
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Health check endpoint
app.get('/health', (req, res) => {
  const stats = roomManager.getStats();
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'webrtc',
    workers: workers.length,
    ...stats,
  });
});

// Mediasoup workers
const workers: mediasoup.types.Worker[] = [];
let roomManager: RoomManager;

async function createWorkers() {
  const numWorkers = config.mediasoup.numWorkers;

  logger.info(`Creating ${numWorkers} mediasoup workers...`);

  for (let i = 0; i < numWorkers; i++) {
    const worker = await mediasoup.createWorker({
      logLevel: config.mediasoup.worker.logLevel,
      logTags: config.mediasoup.worker.logTags,
      rtcMinPort: config.mediasoup.worker.rtcMinPort,
      rtcMaxPort: config.mediasoup.worker.rtcMaxPort,
    });

    worker.on('died', () => {
      logger.error(`Mediasoup worker ${worker.pid} died, exiting in 2s...`);
      setTimeout(() => process.exit(1), 2000);
    });

    workers.push(worker);
    logger.info(`Mediasoup worker ${worker.pid} created`);
  }

  // Initialize room manager with workers
  roomManager = new RoomManager(workers);
}

// Socket.IO event handlers
io.on('connection', (socket: Socket) => {
  logger.info(`Client connected: ${socket.id}`);

  // Join room
  socket.on('joinRoom', async ({ roomId, userId, displayName }, callback) => {
    try {
      logger.info(`Peer ${socket.id} joining room ${roomId}`);

      const room = await roomManager.getOrCreateRoom(roomId, config.mediasoup.router.mediaCodecs);

      // Add peer to room
      room.addPeer(socket.id, userId, displayName);

      // Join socket.io room for broadcasting
      socket.join(roomId);

      // Get other peers in the room
      const otherPeers = room.getOtherPeers(socket.id);

      callback({
        success: true,
        rtpCapabilities: room.router.rtpCapabilities,
        peers: otherPeers.map(peer => ({
          id: peer.id,
          userId: peer.userId,
          displayName: peer.displayName,
        })),
      });

      // Notify other peers
      socket.to(roomId).emit('newPeer', {
        peerId: socket.id,
        userId,
        displayName,
      });

      logger.info(`Peer ${socket.id} joined room ${roomId}`);
    } catch (error) {
      logger.error('Error joining room:', error);
      callback({ success: false, error: 'Failed to join room' });
    }
  });

  // Create WebRTC transport
  socket.on('createTransport', async ({ roomId, direction }, callback) => {
    try {
      const room = roomManager.getRoom(roomId);
      if (!room) {
        throw new Error('Room not found');
      }

      const transport = await room.createWebRtcTransport(socket.id, {
        listenIps: config.mediasoup.webRtcTransport.listenIps,
        enableUdp: config.mediasoup.webRtcTransport.enableUdp,
        enableTcp: config.mediasoup.webRtcTransport.enableTcp,
        preferUdp: config.mediasoup.webRtcTransport.preferUdp,
        initialAvailableOutgoingBitrate: config.mediasoup.webRtcTransport.initialAvailableOutgoingBitrate,
      });

      callback({
        success: true,
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
      });

      logger.info(`Transport created for peer ${socket.id} in room ${roomId}: ${transport.id} (${direction})`);
    } catch (error) {
      logger.error('Error creating transport:', error);
      callback({ success: false, error: 'Failed to create transport' });
    }
  });

  // Connect transport
  socket.on('connectTransport', async ({ roomId, transportId, dtlsParameters }, callback) => {
    try {
      const room = roomManager.getRoom(roomId);
      if (!room) {
        throw new Error('Room not found');
      }

      const peer = room.getPeer(socket.id);
      if (!peer) {
        throw new Error('Peer not found');
      }

      const transport = peer.transports.get(transportId);
      if (!transport) {
        throw new Error('Transport not found');
      }

      await transport.connect({ dtlsParameters });

      callback({ success: true });

      logger.info(`Transport connected for peer ${socket.id}: ${transportId}`);
    } catch (error) {
      logger.error('Error connecting transport:', error);
      callback({ success: false, error: 'Failed to connect transport' });
    }
  });

  // Produce media
  socket.on('produce', async ({ roomId, transportId, kind, rtpParameters, appData }, callback) => {
    try {
      const room = roomManager.getRoom(roomId);
      if (!room) {
        throw new Error('Room not found');
      }

      const producer = await room.createProducer(
        socket.id,
        transportId,
        rtpParameters,
        kind,
        appData,
      );

      callback({ success: true, id: producer.id });

      // Notify other peers about new producer
      socket.to(roomId).emit('newProducer', {
        peerId: socket.id,
        producerId: producer.id,
        kind,
      });

      logger.info(`Producer created for peer ${socket.id} in room ${roomId}: ${producer.id} (${kind})`);
    } catch (error) {
      logger.error('Error producing:', error);
      callback({ success: false, error: 'Failed to produce' });
    }
  });

  // Consume media
  socket.on('consume', async ({ roomId, transportId, producerId, rtpCapabilities }, callback) => {
    try {
      const room = roomManager.getRoom(roomId);
      if (!room) {
        throw new Error('Room not found');
      }

      const consumer = await room.createConsumer(
        socket.id,
        transportId,
        producerId,
        rtpCapabilities,
      );

      callback({
        success: true,
        id: consumer.id,
        producerId: consumer.producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
      });

      logger.info(`Consumer created for peer ${socket.id} in room ${roomId}: ${consumer.id}`);
    } catch (error) {
      logger.error('Error consuming:', error);
      callback({ success: false, error: 'Failed to consume' });
    }
  });

  // Resume consumer
  socket.on('resumeConsumer', async ({ roomId, consumerId }, callback) => {
    try {
      const room = roomManager.getRoom(roomId);
      if (!room) {
        throw new Error('Room not found');
      }

      const peer = room.getPeer(socket.id);
      if (!peer) {
        throw new Error('Peer not found');
      }

      const consumer = peer.consumers.get(consumerId);
      if (!consumer) {
        throw new Error('Consumer not found');
      }

      await consumer.resume();

      callback({ success: true });

      logger.info(`Consumer resumed for peer ${socket.id}: ${consumerId}`);
    } catch (error) {
      logger.error('Error resuming consumer:', error);
      callback({ success: false, error: 'Failed to resume consumer' });
    }
  });

  // Close producer
  socket.on('closeProducer', async ({ roomId, producerId }, callback) => {
    try {
      const room = roomManager.getRoom(roomId);
      if (!room) {
        throw new Error('Room not found');
      }

      room.closeProducer(socket.id, producerId);

      // Notify other peers
      socket.to(roomId).emit('producerClosed', {
        peerId: socket.id,
        producerId,
      });

      callback({ success: true });

      logger.info(`Producer closed for peer ${socket.id}: ${producerId}`);
    } catch (error) {
      logger.error('Error closing producer:', error);
      callback({ success: false, error: 'Failed to close producer' });
    }
  });

  // Leave room
  socket.on('leaveRoom', async ({ roomId }, callback) => {
    try {
      const room = roomManager.getRoom(roomId);
      if (room) {
        room.removePeer(socket.id);
        socket.leave(roomId);

        // Notify other peers
        socket.to(roomId).emit('peerLeft', {
          peerId: socket.id,
        });

        logger.info(`Peer ${socket.id} left room ${roomId}`);
      }

      callback({ success: true });
    } catch (error) {
      logger.error('Error leaving room:', error);
      callback({ success: false, error: 'Failed to leave room' });
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);

    // Remove from all rooms
    roomManager.getRooms().forEach(room => {
      const peer = room.getPeer(socket.id);
      if (peer) {
        room.removePeer(socket.id);
        io.to(room.id).emit('peerLeft', {
          peerId: socket.id,
        });
      }
    });
  });
});

// Start server
async function startServer() {
  try {
    // Create mediasoup workers
    await createWorkers();

    // Test Redis connection
    await redis.ping();
    logger.info('Redis connection established');

    const port = process.env.PORT || 4000;
    httpServer.listen(port, () => {
      logger.info(`
╔═══════════════════════════════════════════════╗
║   Idea Communicator WebRTC Server            ║
╠═══════════════════════════════════════════════╣
║   🚀 Server running on: http://localhost:${port}  ║
║   👷 Workers: ${workers.length}                              ║
║   🌍 Environment: ${process.env.NODE_ENV || 'development'}                ║
╚═══════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing gracefully...');

  roomManager.closeAll();

  httpServer.close(() => {
    logger.info('HTTP server closed');
  });

  await redis.quit();
  logger.info('Redis connection closed');

  workers.forEach(worker => worker.close());
  logger.info('Mediasoup workers closed');

  process.exit(0);
});

startServer();
