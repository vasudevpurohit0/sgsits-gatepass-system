import Redis from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

const redisConfig = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
};

export const redis = new Redis(redisConfig);

redis.on('connect', () => {
  logger.info('🔌 Redis connection established');
});

redis.on('error', (err) => {
  logger.error('❌ Redis connection error:', err);
});
