import mongoose from 'mongoose';

let mongoMemoryServer = null;

const connectDB = async () => {
  try {
    let mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/citywatch';
    
    try {
      await mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 2000 });
      console.log(`✅ MongoDB Connected: ${mongoose.connection.host}`);
    } catch (localErr) {
      console.warn('⚠️ Local MongoDB connection failed, spinning up in-memory MongoDB instance for development...');
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      mongoMemoryServer = await MongoMemoryServer.create({
        binary: { version: '7.0.14', checkMD5: false }
      });
      mongoURI = mongoMemoryServer.getUri();
      await mongoose.connect(mongoURI);
      console.log(`✅ In-Memory MongoDB Connected for Dev: ${mongoURI}`);
    }
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

export default connectDB;