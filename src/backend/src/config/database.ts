import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { initializeGridFS } from './gridfs'; // Import GridFS initializer

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
// const DB_NAME = process.env.DB_NAME || 'synapse_db'; // Not directly used by mongoose.connect if DB is in URI

// Construct the full URI if DB_NAME is separate and MONGODB_URI is just the server part
// However, it's usually best to have the full URI including DB name in MONGODB_URI itself.
// For example: MONGODB_URI=mongodb://localhost:27017/synapse_db

if (!MONGODB_URI) {
  console.error('Error: MONGODB_URI is not defined in .env file');
  process.exit(1);
}

export const connectToDatabase = async () => {
  // Mongoose connection listeners (optional but good for debugging)
  mongoose.connection.on('connected', () => {
    console.log('[mongoose]: Mongoose connected to DB');
    initializeGridFS(); // Initialize GridFS after connection is established
  });
  mongoose.connection.on('error', (err: Error) => {
    console.error('[mongoose]: Mongoose connection error:', err);
  });
  mongoose.connection.on('disconnected', () => {
    console.log('[mongoose]: Mongoose disconnected');
  });

  try {
    // Mongoose handles connection pooling internally.
    // The options object can be used to set timeouts, etc., if needed.
    await mongoose.connect(MONGODB_URI, {
      // If MONGODB_URI does not include the database name, you might need:
      // dbName: process.env.DB_NAME || 'synapse_db',
      // serverSelectionTimeoutMS: 5000, // Optional: Adjust timeout
    });
    // The console.log in the 'connected' event listener will confirm success.
    // No need to return the db instance; Mongoose models will use the default connection.
  } catch (error) {
    console.error('[mongoose]: Could not connect to MongoDB with Mongoose', error);
    process.exit(1);
  }
};

// The getDb function using native driver is no longer needed for Mongoose.
// Mongoose models will automatically use the connection established by mongoose.connect().
// If you ever need the raw native Db object from Mongoose, it's mongoose.connection.db 