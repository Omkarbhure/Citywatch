import mongoose from 'mongoose';

let mongoMemoryServer = null;

const connectDB = async () => {
  try {
    let mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/citywatch';
    
    try {
      await mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 2000 });
      console.log(`✅ MongoDB Connected: ${mongoose.connection.host}`);
    } catch (localErr) {
      console.warn('⚠️ Local MongoDB connection failed, spinning up persistent MongoDB instance for development...');
      const fs = await import('fs');
      const path = await import('path');
      const dbDir = path.resolve('./.mongo-data');
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      const { MongoMemoryServer } = await import('mongodb-memory-server');
      mongoMemoryServer = await MongoMemoryServer.create({
        binary: { version: '7.0.14', checkMD5: false },
        instance: {
          dbPath: dbDir,
          storageEngine: 'wiredTiger',
        },
      });
      mongoURI = mongoMemoryServer.getUri();
      await mongoose.connect(mongoURI);
      console.log(`✅ Persistent MongoDB Connected for Dev: ${mongoURI}`);
    }
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

export default connectDB;