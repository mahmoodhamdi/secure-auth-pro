// Set environment variables BEFORE importing anything else
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
process.env.JWT_SECRET = 'test-jwt-secret-key-must-be-32-chars-long-for-testing';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-must-be-32-chars-long-for-testing';
process.env.JWT_ACCESS_EXPIRY = '15m';
process.env.JWT_REFRESH_EXPIRY = '7d';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongod: MongoMemoryServer;

// Connect to in-memory database before tests
beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
});

// Clear database between tests
afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// Disconnect and stop in-memory database after tests
afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

// Mock Redis for tests
jest.mock('../src/config/redis', () => ({
  redisClient: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    setEx: jest.fn(),
  },
  connectRedis: jest.fn(),
  disconnectRedis: jest.fn(),
  addToBlacklist: jest.fn().mockResolvedValue(undefined),
  isBlacklisted: jest.fn().mockResolvedValue(false),
}));

// Mock email service
jest.mock('../src/services/email.service', () => ({
  emailService: {
    sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    sendPasswordChangedEmail: jest.fn().mockResolvedValue(undefined),
    sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
    send2FAEnabledEmail: jest.fn().mockResolvedValue(undefined),
    sendNewLoginAlert: jest.fn().mockResolvedValue(undefined),
  },
}));

// Increase timeout for database operations
jest.setTimeout(30000);
