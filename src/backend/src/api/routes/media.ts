import { Router } from 'express';
import { getBucket } from '../../config/gridfs';
import { ObjectId } from 'mongodb';
import multer from 'multer';
import { Readable } from 'stream';

const router = Router();

// Configure multer for memory storage (we'll stream directly to GridFS)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images only
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// POST /upload - Upload image to GridFS
router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided'
      });
    }

    const bucket = getBucket();
    const uploadStream = bucket.openUploadStream(req.file.originalname, {
      contentType: req.file.mimetype,
      metadata: {
        uploadedAt: new Date(),
        originalName: req.file.originalname,
        size: req.file.size
      }
    });

    // Create a readable stream from the buffer
    const readableStream = new Readable();
    readableStream.push(req.file.buffer);
    readableStream.push(null);

    // Handle upload completion
    uploadStream.on('finish', () => {
      const fileUrl = `/api/v1/media/${uploadStream.id}`;
      res.json({
        success: true,
        data: {
          id: uploadStream.id.toString(),
          url: fileUrl,
          filename: req.file?.originalname,
          contentType: req.file?.mimetype,
          size: req.file?.size
        }
      });
    });

    // Handle upload errors
    uploadStream.on('error', (error) => {
      console.error('Error uploading to GridFS:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload image'
      });
    });

    // Pipe the file buffer to GridFS
    readableStream.pipe(uploadStream);

  } catch (error) {
    console.error('Error in media upload:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const bucket = getBucket();
    const fileId = new ObjectId(req.params.id);

    // Find the file in GridFS to get metadata
    const files = await bucket.find({ _id: fileId }).toArray();
    if (!files || files.length === 0) {
      return res.status(404).json({ message: 'File not found' });
    }

    const file = files[0];

    // Set headers
    res.set('Content-Type', file.contentType || 'application/octet-stream');
    res.set('Content-Disposition', `inline; filename="${file.filename}"`);
    res.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year

    // Open a download stream and pipe it to the response
    const downloadStream = bucket.openDownloadStream(fileId);

    downloadStream.on('error', (error) => {
      console.error('Error streaming file from GridFS:', error);
      // If headers are already sent, we can't send a JSON error response.
      // The connection will likely be terminated by the client.
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error streaming file' });
      }
    });

    downloadStream.pipe(res);

  } catch (error) {
    console.error('Error fetching file from GridFS:', error);
    if (error instanceof Error && error.message.includes('Argument passed in must be a single String')) {
        return res.status(400).json({ message: 'Invalid file ID format.' });
    }
    // Ensure we don't try to send a response if one has already been partially sent
    if (!res.headersSent) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
  }
});

export default router; 