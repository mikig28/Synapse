import { GridFSBucket } from 'mongodb';
import mongoose from 'mongoose';

let bucket: GridFSBucket;

/**
 * Initializes the GridFS bucket. This should be called after a successful Mongoose connection.
 */
export const initializeGridFS = () => {
  if (!bucket && mongoose.connection.readyState === 1) {
    const db = mongoose.connection.db;
    bucket = new GridFSBucket(db, {
      bucketName: 'media',
    });
    console.log('[GridFS]: Bucket "media" initialized.');
  } else if (mongoose.connection.readyState !== 1) {
    console.error('[GridFS]: Cannot initialize. Mongoose is not connected.');
  }
};

/**
 * Returns the GridFS bucket instance.
 * @returns {GridFSBucket} The GridFSBucket instance.
 * @throws {Error} If GridFS has not been initialized.
 */
export const getBucket = (): GridFSBucket => {
  if (!bucket) {
    // Attempt to initialize it on-the-fly if connection is ready
    if (mongoose.connection.readyState === 1) {
      initializeGridFS();
    } else {
      throw new Error('GridFS bucket has not been initialized. Ensure initializeGridFS() is called after DB connection.');
    }
  }
  return bucket;
}; 