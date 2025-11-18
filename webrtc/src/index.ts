import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import Redis from 'ioredis';
import * as mediasoup from 'mediasoup';
import { config } from './config';
import { logger } from './lib/logger';
import { RoomManager } from './lib/RoomManager';
import {
  CreateRoomRequest,
  CreateRoomResponse,
  JoinRoomRequest,
  JoinRoomResponse,
  CreateTransportRequest,
  CreateTransportResponse,
  ConnectTransportRequest,
  ProduceRequest,
  ProduceResponse,
  ConsumeRequest,
  ConsumeResponse,
  ResumeConsumerRequest,
  LeaveRoomRequest,
  GetProducersRequest,
  GetProducersResponse,
} from './types/webrtc.types';

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
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'webrtc',
  });
});

// Stats endpoint
app.get('/stats', (req, res) => {
  if (roomManager) {
    res.status(200).json(roomManager.getStats());
  } else {
    res.status(503).json({ error: 'Room manager not initialized' });
  }
});

// Mediasoup workers (will be initialized on startup)
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

  // Initialize RoomManager
  roomManager = new RoomManager(workers);
}

// Socket.IO event handlers
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  /**
   * Create or get a room and return router RTP capabilities
   */
  socket.on('createRoom', async (data: CreateRoomRequest, callback) => {
    try {
      const { callId } = data;
      const room = await roomManager.getOrCreateRoom(callId);

      const response: CreateRoomResponse = {
        rtpCapabilities: room.router.rtpCapabilities,
      };

      callback({ success: true, data: response });
      logger.info(`Room ${callId} created/retrieved for socket ${socket.id}`);
    } catch (error: any) {
      logger.error('Error creating room:', error);
      callback({ success: false, error: error.message });
    }
  });

  /**
   * Join a room as a peer
   */
  socket.on('joinRoom', async (data: JoinRoomRequest, callback) => {
    try {
      const { callId, userId, rtpCapabilities } = data;

      // Add peer to room
      await roomManager.addPeer(callId, userId, socket, rtpCapabilities);

      // Get other peers in room
      const peers = roomManager.getPeersInRoom(callId)
        .filter(p => p.id !== socket.id)
        .map(p => ({ peerId: p.id, userId: p.userId }));

      const response: JoinRoomResponse = { peers };

      callback({ success: true, data: response });

      // Notify other peers about new peer
      roomManager.broadcastToRoom(callId, 'peerJoined', {
        peerId: socket.id,
        userId,
      }, socket.id);

      logger.info(`Peer ${socket.id} (user ${userId}) joined room ${callId}`);
    } catch (error: any) {
      logger.error('Error joining room:', error);
      callback({ success: false, error: error.message });
    }
  });

  /**
   * Create a WebRTC transport (send or recv)
   */
  socket.on('createTransport', async (data: CreateTransportRequest, callback) => {
    try {
      const { direction } = data;

      const transportInfo = await roomManager.createTransport(socket.id, direction);

      const response: CreateTransportResponse = { transport: transportInfo };

      callback({ success: true, data: response });
      logger.info(`Transport ${transportInfo.id} (${direction}) created for ${socket.id}`);
    } catch (error: any) {
      logger.error('Error creating transport:', error);
      callback({ success: false, error: error.message });
    }
  });

  /**
   * Connect a transport
   */
  socket.on('connectTransport', async (data: ConnectTransportRequest, callback) => {
    try {
      const { transportId, dtlsParameters } = data;

      await roomManager.connectTransport(socket.id, transportId, dtlsParameters);

      callback({ success: true });
      logger.info(`Transport ${transportId} connected for ${socket.id}`);
    } catch (error: any) {
      logger.error('Error connecting transport:', error);
      callback({ success: false, error: error.message });
    }
  });

  /**
   * Produce media (publish audio/video)
   */
  socket.on('produce', async (data: ProduceRequest, callback) => {
    try {
      const { transportId, kind, rtpParameters, appData } = data;

      const producerId = await roomManager.produce(
        socket.id,
        transportId,
        kind,
        rtpParameters,
        appData,
      );

      const response: ProduceResponse = { id: producerId };

      callback({ success: true, data: response });
      logger.info(`Producer ${producerId} (${kind}) created for ${socket.id}`);
    } catch (error: any) {
      logger.error('Error producing:', error);
      callback({ success: false, error: error.message });
    }
  });

  /**
   * Consume media (subscribe to remote producer)
   */
  socket.on('consume', async (data: ConsumeRequest, callback) => {
    try {
      const { transportId, producerId, rtpCapabilities } = data;

      const consumerInfo = await roomManager.consume(
        socket.id,
        transportId,
        producerId,
        rtpCapabilities,
      );

      const response: ConsumeResponse = { consumer: consumerInfo };

      callback({ success: true, data: response });
      logger.info(`Consumer ${consumerInfo.id} created for ${socket.id}`);
    } catch (error: any) {
      logger.error('Error consuming:', error);
      callback({ success: false, error: error.message });
    }
  });

  /**
   * Resume a consumer (start receiving media)
   */
  socket.on('resumeConsumer', async (data: ResumeConsumerRequest, callback) => {
    try {
      const { consumerId } = data;

      await roomManager.resumeConsumer(socket.id, consumerId);

      callback({ success: true });
      logger.info(`Consumer ${consumerId} resumed for ${socket.id}`);
    } catch (error: any) {
      logger.error('Error resuming consumer:', error);
      callback({ success: false, error: error.message });
    }
  });

  /**
   * Get all producers in a room
   */
  socket.on('getProducers', async (data: GetProducersRequest, callback) => {
    try {
      const { callId } = data;

      const producers = roomManager.getProducers(callId, socket.id);

      const response: GetProducersResponse = { producers };

      callback({ success: true, data: response });
      logger.info(`Retrieved ${producers.length} producers for ${socket.id} in room ${callId}`);
    } catch (error: any) {
      logger.error('Error getting producers:', error);
      callback({ success: false, error: error.message });
    }
  });

  /**
   * Leave a room
   */
  socket.on('leaveRoom', async (data: LeaveRoomRequest, callback) => {
    try {
      await roomManager.removePeer(socket.id);

      callback({ success: true });
      logger.info(`Peer ${socket.id} left room`);
    } catch (error: any) {
      logger.error('Error leaving room:', error);
      callback({ success: false, error: error.message });
    }
  });

  /**
   * Handle disconnect - cleanup peer resources
   */
  socket.on('disconnect', async () => {
    logger.info(`Client disconnected: ${socket.id}`);

    try {
      await roomManager.removePeer(socket.id);
    } catch (error) {
      logger.error('Error cleaning up disconnected peer:', error);
    }
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
