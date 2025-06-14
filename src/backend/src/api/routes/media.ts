import { Router } from 'express';
import { getBucket } from '../../config/gridfs';
import { ObjectId } from 'mongodb';

const router = Router();

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