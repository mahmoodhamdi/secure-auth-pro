import { createClient, RedisClientType } from 'redis';
import { config } from './env.js';
import { logger } from '../utils/logger.js';

let redisClient: RedisClientType | null = null;

/**
 * Create and connect Redis client
 */
export const connectRedis = async (): Promise<RedisClientType> => {
  try {
    redisClient = createClient({
      socket: {
        host: config.redis.host,
        port: config.redis.port,
      },
      password: config.redis.password || undefined,
    });

    redisClient.on('connect', () => {
      logger.info('Redis client connecting...');
    });

    redisClient.on('ready', () => {
      logger.info('Redis client ready');
    });

    redisClient.on('error', (err) => {
      logger.error('Redis client error:', err);
    });

    redisClient.on('end', () => {
      logger.info('Redis client disconnected');
    });

    await redisClient.connect();

    logger.info(`Redis connected to: ${config.redis.host}:${config.redis.port}`);

    return redisClient;
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    throw error;
  }
};

/**
 * Get Redis client instance
 */
export const getRedisClient = (): RedisClientType => {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call connectRedis first.');
  }
  return redisClient;
};

/**
 * Disconnect Redis client
 */
export const disconnectRedis = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis disconnected');
  }
};

/**
 * Check if Redis is connected
 */
export const isRedisConnected = (): boolean => {
  return redisClient?.isOpen ?? false;
};

// Redis utility functions

/**
 * Set a value with optional expiry
 */
export const redisSet = async (
  key: string,
  value: string,
  expirySeconds?: number
): Promise<void> => {
  const client = getRedisClient();
  if (expirySeconds) {
    await client.setEx(key, expirySeconds, value);
  } else {
    await client.set(key, value);
  }
};

/**
 * Get a value
 */
export const redisGet = async (key: string): Promise<string | null> => {
  const client = getRedisClient();
  return client.get(key);
};

/**
 * Delete a key
 */
export const redisDel = async (key: string): Promise<void> => {
  const client = getRedisClient();
  await client.del(key);
};

/**
 * Check if key exists
 */
export const redisExists = async (key: string): Promise<boolean> => {
  const client = getRedisClient();
  const result = await client.exists(key);
  return result === 1;
};

/**
 * Add to blacklist (for token invalidation)
 */
export const addToBlacklist = async (token: string, expirySeconds: number): Promise<void> => {
  await redisSet(`blacklist:${token}`, '1', expirySeconds);
};

/**
 * Check if token is blacklisted
 */
export const isBlacklisted = async (token: string): Promise<boolean> => {
  return redisExists(`blacklist:${token}`);
};
