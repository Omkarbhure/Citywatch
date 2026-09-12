import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

// Spin up MongoMemoryServer at setup module load so process.env.MONGODB_URI is available when server.js is imported
const mongod = await MongoMemoryServer.create({
  binary: {
    version: '7.0.14',
    checkMD5: false,
  },
});
const uri = mongod.getUri();
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = uri;
process.env.JWT_SECRET = 'test-jwt-secret-for-citywatch-testing-32-chars-long';
process.env.CLIENT_URL = 'http://localhost:3000';
process.env.PORT = '5001';
process.env.AUTH_RATE_LIMIT_MAX = '3';

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri);
  }
});

afterEach(async () => {
  if (mongoose.connection.readyState !== 0) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongod) {
    await mongod.stop();
  }
}, 30000);
