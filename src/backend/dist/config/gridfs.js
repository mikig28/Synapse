"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBucket = exports.initializeGridFS = void 0;
const mongodb_1 = require("mongodb");
const mongoose_1 = __importDefault(require("mongoose"));
let bucket;
/**
 * Initializes the GridFS bucket. This should be called after a successful Mongoose connection.
 */
const initializeGridFS = () => {
    if (!bucket && mongoose_1.default.connection.readyState === 1) {
        const db = mongoose_1.default.connection.db;
        if (!db) {
            console.error('[GridFS]: Cannot initialize. Mongoose has no db object.');
            return;
        }
        bucket = new mongodb_1.GridFSBucket(db, {
            bucketName: 'media',
        });
        console.log('[GridFS]: Bucket "media" initialized.');
    }
    else if (mongoose_1.default.connection.readyState !== 1) {
        console.error('[GridFS]: Cannot initialize. Mongoose is not connected.');
    }
};
exports.initializeGridFS = initializeGridFS;
/**
 * Returns the GridFS bucket instance.
 * @returns {GridFSBucket} The GridFSBucket instance.
 * @throws {Error} If GridFS has not been initialized.
 */
const getBucket = () => {
    if (!bucket) {
        // Attempt to initialize it on-the-fly if connection is ready
        if (mongoose_1.default.connection.readyState === 1) {
            (0, exports.initializeGridFS)();
        }
        else {
            throw new Error('GridFS bucket has not been initialized. Ensure initializeGridFS() is called after DB connection.');
        }
    }
    return bucket;
};
exports.getBucket = getBucket;
