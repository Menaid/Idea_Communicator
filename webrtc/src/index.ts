import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import Redis from 'ioredis';
import * as mediasoup from 'mediasoup';
import { config } from './config';
import { logger } from './lib/logger';

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

// Mediasoup workers (will be initialized on startup)
const workers: mediasoup.types.Worker[] = [];
let nextWorkerIdx = 0;

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
}

function getNextWorker(): mediasoup.types.Worker {
  const worker = workers[nextWorkerIdx];
  nextWorkerIdx = (nextWorkerIdx + 1) % workers.length;
  return worker;
}

// Socket.IO event handlers
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });

  socket.on('getRouterRtpCapabilities', async (callback) => {
    try {
      const worker = getNextWorker();
      // Router creation logic will be implemented in Fas 3
      callback({ success: true });
    } catch (error) {
      logger.error('Error getting router capabilities:', error);
      callback({ success: false, error: 'Failed to get router capabilities' });
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
