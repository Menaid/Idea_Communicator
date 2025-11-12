import Queue from 'bull';
import Redis from 'ioredis';
import { logger } from './config/logger';
import { transcriptionProcessor } from './processors/transcription.processor';
import { summarizationProcessor } from './processors/summarization.processor';

// Redis connection
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const createRedisClient = () => {
  return new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
};

// Create queues
const transcriptionQueue = new Queue('transcription', {
  redis: redisUrl,
  createClient: (type) => {
    switch (type) {
      case 'client':
        return createRedisClient();
      case 'subscriber':
        return createRedisClient();
      case 'bclient':
        return createRedisClient();
      default:
        return createRedisClient();
    }
  },
});

const summarizationQueue = new Queue('summarization', {
  redis: redisUrl,
  createClient: (type) => {
    switch (type) {
      case 'client':
        return createRedisClient();
      case 'subscriber':
        return createRedisClient();
      case 'bclient':
        return createRedisClient();
      default:
        return createRedisClient();
    }
  },
});

// Process transcription jobs
transcriptionQueue.process(async (job) => {
  logger.info(`Processing transcription job ${job.id}`);
  return await transcriptionProcessor(job.data);
});

// Process summarization jobs
summarizationQueue.process(async (job) => {
  logger.info(`Processing summarization job ${job.id}`);
  return await summarizationProcessor(job.data);
});

// Event handlers for transcription queue
transcriptionQueue.on('completed', (job, result) => {
  logger.info(`Transcription job ${job.id} completed`, { result });
});

transcriptionQueue.on('failed', (job, err) => {
  logger.error(`Transcription job ${job?.id} failed`, { error: err.message });
});

// Event handlers for summarization queue
summarizationQueue.on('completed', (job, result) => {
  logger.info(`Summarization job ${job.id} completed`, { result });
});

summarizationQueue.on('failed', (job, err) => {
  logger.error(`Summarization job ${job?.id} failed`, { error: err.message });
});

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down AI worker...');
  await transcriptionQueue.close();
  await summarizationQueue.close();
  logger.info('AI worker shut down successfully');
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

logger.info(`
╔═══════════════════════════════════════════════╗
║   Idea Communicator AI Worker                 ║
╠═══════════════════════════════════════════════╣
║   🤖 Worker started                           ║
║   📝 Transcription queue: active              ║
║   💡 Summarization queue: active              ║
║   🌍 Environment: ${process.env.NODE_ENV || 'development'}                ║
║   🔧 AI Provider: ${process.env.AI_PROVIDER || 'openai'}                  ║
╚═══════════════════════════════════════════════╝
`);
