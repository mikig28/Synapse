import { Request, Response } from 'express';
import mongoose from 'mongoose';
import fs from 'fs-extra';
import path from 'path';
import { Parser } from 'json2csv';
import PDFDocument from 'pdfkit';
import JSZip from 'jszip';
import { v4 as uuidv4 } from 'uuid';

// Models
import Document from '../../models/Document';
import Note from '../../models/Note';
import BookmarkItem from '../../models/BookmarkItem';
import Task from '../../models/Task';
import Idea from '../../models/Idea';
import VideoItem from '../../models/VideoItem';
import NewsItem from '../../models/NewsItem';
import WhatsAppMessage from '../../models/WhatsAppMessage';
import TelegramItem from '../../models/TelegramItem';
import Meeting from '../../models/Meeting';
import User from '../../models/User';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

interface ExportRequest {
  format: 'json' | 'csv' | 'pdf' | 'zip';
  contentTypes: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  includeMetadata?: boolean;
  anonymize?: boolean;
}

interface ExportJob {
  id: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  format: string;
  contentTypes: string[];
  progress: number;
  totalItems: number;
  processedItems: number;
  downloadUrl?: string;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
  expiresAt: Date;
}

// In-memory store for export jobs (in production, use Redis or database)
const exportJobs = new Map<string, ExportJob>();

// Cleanup expired jobs every hour
setInterval(() => {
  const now = new Date();
  for (const [jobId, job] of exportJobs.entries()) {
    if (job.expiresAt < now) {
      // Clean up files
      if (job.downloadUrl) {
        const filePath = path.join(process.cwd(), 'public', 'exports', path.basename(job.downloadUrl));
        fs.remove(filePath).catch(console.error);
      }
      exportJobs.delete(jobId);
    }
  }
}, 3600000); // 1 hour

/**
 * Create a new export job
 */
export const createExportJob = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const {
      format = 'json',
      contentTypes = ['all'],
      dateRange,
      includeMetadata = true,
      anonymize = false
    }: ExportRequest = req.body;

    // Validate format
    if (!['json', 'csv', 'pdf', 'zip'].includes(format)) {
      return res.status(400).json({ success: false, error: 'Invalid export format' });
    }

    // Create export job
    const jobId = uuidv4();
    const job: ExportJob = {
      id: jobId,
      userId,
      status: 'pending',
      format,
      contentTypes,
      progress: 0,
      totalItems: 0,
      processedItems: 0,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };

    exportJobs.set(jobId, job);

    // Start export process asynchronously
    processExportJob(jobId, {
      format,
      contentTypes,
      dateRange,
      includeMetadata,
      anonymize,
      userId
    }).catch(error => {
      console.error(`Export job ${jobId} failed:`, error);
      const failedJob = exportJobs.get(jobId);
      if (failedJob) {
        failedJob.status = 'failed';
        failedJob.error = error.message;
      }
    });

    res.json({
      success: true,
      data: {
        jobId,
        status: job.status,
        message: 'Export job created and processing started'
      }
    });

  } catch (error) {
    console.error('Export job creation error:', error);
    res.status(500).json({ success: false, error: 'Failed to create export job' });
  }
};

/**
 * Get export job status
 */
export const getExportJobStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { jobId } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const job = exportJobs.get(jobId);
    if (!job || job.userId !== userId) {
      return res.status(404).json({ success: false, error: 'Export job not found' });
    }

    res.json({
      success: true,
      data: {
        id: job.id,
        status: job.status,
        progress: job.progress,
        totalItems: job.totalItems,
        processedItems: job.processedItems,
        downloadUrl: job.downloadUrl,
        error: job.error,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        expiresAt: job.expiresAt
      }
    });

  } catch (error) {
    console.error('Export job status error:', error);
    res.status(500).json({ success: false, error: 'Failed to get export job status' });
  }
};

/**
 * Download export file
 */
export const downloadExportFile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { jobId } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const job = exportJobs.get(jobId);
    if (!job || job.userId !== userId) {
      return res.status(404).json({ success: false, error: 'Export job not found' });
    }

    if (job.status !== 'completed' || !job.downloadUrl) {
      return res.status(400).json({ success: false, error: 'Export not ready for download' });
    }

    const filePath = path.join(process.cwd(), 'public', 'exports', path.basename(job.downloadUrl));
    
    if (!await fs.pathExists(filePath)) {
      return res.status(404).json({ success: false, error: 'Export file not found' });
    }

    const fileName = `synapse-export-${job.id}.${job.format === 'zip' ? 'zip' : job.format}`;
    
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', getContentType(job.format));
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    // Log download
    console.log(`Export downloaded: ${jobId} by user ${userId}`);

  } catch (error) {
    console.error('Export download error:', error);
    res.status(500).json({ success: false, error: 'Failed to download export' });
  }
};

/**
 * Get user's export history
 */
export const getExportHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const userJobs = Array.from(exportJobs.values())
      .filter(job => job.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 20) // Last 20 jobs
      .map(job => ({
        id: job.id,
        status: job.status,
        format: job.format,
        contentTypes: job.contentTypes,
        progress: job.progress,
        totalItems: job.totalItems,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        expiresAt: job.expiresAt,
        downloadUrl: job.status === 'completed' ? `/api/v1/export/${job.id}/download` : null
      }));

    res.json({
      success: true,
      data: userJobs
    });

  } catch (error) {
    console.error('Export history error:', error);
    res.status(500).json({ success: false, error: 'Failed to get export history' });
  }
};

/**
 * Process export job asynchronously
 */
async function processExportJob(jobId: string, options: any): Promise<void> {
  const job = exportJobs.get(jobId);
  if (!job) return;

  try {
    job.status = 'processing';
    console.log(`Starting export job ${jobId} for user ${job.userId}`);

    // Get user data
    const userData = await collectUserData(job.userId, options);
    job.totalItems = userData.totalItems;

    // Ensure export directory exists
    const exportDir = path.join(process.cwd(), 'public', 'exports');
    await fs.ensureDir(exportDir);

    // Generate export file
    const fileName = `export-${jobId}.${options.format === 'zip' ? 'zip' : options.format}`;
    const filePath = path.join(exportDir, fileName);

    switch (options.format) {
      case 'json':
        await exportToJSON(filePath, userData, options);
        break;
      case 'csv':
        await exportToCSV(filePath, userData, options);
        break;
      case 'pdf':
        await exportToPDF(filePath, userData, options);
        break;
      case 'zip':
        await exportToZIP(filePath, userData, options);
        break;
    }

    // Update job status
    job.status = 'completed';
    job.progress = 100;
    job.processedItems = job.totalItems;
    job.completedAt = new Date();
    job.downloadUrl = `/exports/${fileName}`;

    console.log(`Export job ${jobId} completed successfully`);

  } catch (error) {
    console.error(`Export job ${jobId} failed:`, error);
    job.status = 'failed';
    job.error = (error as Error).message;
  }
}

/**
 * Collect all user data for export
 */
async function collectUserData(userId: string, options: any): Promise<any> {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const data: any = {};
  let totalItems = 0;

  // Build date filter
  let dateFilter = {};
  if (options.dateRange) {
    dateFilter = {
      createdAt: {
        $gte: new Date(options.dateRange.start),
        $lte: new Date(options.dateRange.end)
      }
    };
  }

  // Get user info
  const user = await User.findById(userObjectId).select('-password');
  if (user) {
    data.user = user.toObject();
    if (options.anonymize) {
      data.user.email = 'anonymized@user.com';
      data.user.name = 'Anonymized User';
    }
  }

  // Collect content types
  const types = options.contentTypes.includes('all') ? 
    ['documents', 'notes', 'bookmarks', 'tasks', 'ideas', 'videos', 'news', 'telegram', 'meetings'] :
    options.contentTypes;

  if (types.includes('documents')) {
    data.documents = await Document.find({ userId: userObjectId, ...dateFilter });
    totalItems += data.documents.length;
  }

  if (types.includes('notes')) {
    data.notes = await Note.find({ userId: userObjectId, ...dateFilter });
    totalItems += data.notes.length;
  }

  if (types.includes('bookmarks')) {
    data.bookmarks = await BookmarkItem.find({ userId: userObjectId, ...dateFilter });
    totalItems += data.bookmarks.length;
  }

  if (types.includes('tasks')) {
    data.tasks = await Task.find({ userId: userObjectId, ...dateFilter });
    totalItems += data.tasks.length;
  }

  if (types.includes('ideas')) {
    data.ideas = await Idea.find({ userId: userObjectId, ...dateFilter });
    totalItems += data.ideas.length;
  }

  if (types.includes('videos')) {
    data.videos = await VideoItem.find({ userId: userObjectId, ...dateFilter });
    totalItems += data.videos.length;
  }

  if (types.includes('news')) {
    data.news = await NewsItem.find({ userId: userObjectId, ...dateFilter });
    totalItems += data.news.length;
  }

  if (types.includes('telegram')) {
    data.telegram = await TelegramItem.find({ userId: userObjectId, ...dateFilter });
    totalItems += data.telegram.length;
  }

  if (types.includes('meetings')) {
    data.meetings = await Meeting.find({ userId: userObjectId, ...dateFilter });
    totalItems += data.meetings.length;
  }

  // WhatsApp messages don't have userId, so we get all (in real app, filter by user sessions)
  if (types.includes('whatsapp')) {
    data.whatsapp = await WhatsAppMessage.find(dateFilter).limit(1000); // Limit for performance
    totalItems += data.whatsapp.length;
  }

  // Add export metadata
  data.exportMetadata = {
    exportId: options.jobId || 'unknown',
    exportDate: new Date().toISOString(),
    format: options.format,
    contentTypes: options.contentTypes,
    totalItems,
    dateRange: options.dateRange,
    anonymized: options.anonymize,
    version: '1.0'
  };

  return { ...data, totalItems };
}

/**
 * Export to JSON format
 */
async function exportToJSON(filePath: string, userData: any, options: any): Promise<void> {
  const jsonData = JSON.stringify(userData, null, 2);
  await fs.writeFile(filePath, jsonData, 'utf8');
}

/**
 * Export to CSV format (multiple files in one)
 */
async function exportToCSV(filePath: string, userData: any, options: any): Promise<void> {
  const csvContent: string[] = [];
  
  // Add metadata header
  csvContent.push('=== SYNAPSE DATA EXPORT ===');
  csvContent.push(`Export Date: ${userData.exportMetadata.exportDate}`);
  csvContent.push(`Total Items: ${userData.exportMetadata.totalItems}`);
  csvContent.push('');

  // Convert each data type to CSV
  for (const [type, items] of Object.entries(userData)) {
    if (type === 'exportMetadata' || type === 'user' || type === 'totalItems') continue;
    if (!Array.isArray(items) || items.length === 0) continue;

    csvContent.push(`=== ${type.toUpperCase()} (${items.length} items) ===`);
    
    try {
      const parser = new Parser();
      const csv = parser.parse(items);
      csvContent.push(csv);
    } catch (error) {
      csvContent.push(`Error parsing ${type}: ${error}`);
    }
    
    csvContent.push('');
  }

  await fs.writeFile(filePath, csvContent.join('\n'), 'utf8');
}

/**
 * Export to PDF format
 */
async function exportToPDF(filePath: string, userData: any, options: any): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Header
    doc.fontSize(20).text('Synapse Data Export', 50, 50);
    doc.fontSize(12).text(`Export Date: ${userData.exportMetadata.exportDate}`, 50, 80);
    doc.text(`Total Items: ${userData.exportMetadata.totalItems}`, 50, 95);
    
    let yPos = 130;

    // Add each data type
    for (const [type, items] of Object.entries(userData)) {
      if (type === 'exportMetadata' || type === 'user' || type === 'totalItems') continue;
      if (!Array.isArray(items) || items.length === 0) continue;

      // Check if we need a new page
      if (yPos > 700) {
        doc.addPage();
        yPos = 50;
      }

      doc.fontSize(16).text(`${type.toUpperCase()} (${items.length} items)`, 50, yPos);
      yPos += 30;

      // Add first few items as examples
      const sampleItems = items.slice(0, 5);
      for (const item of sampleItems) {
        if (yPos > 750) {
          doc.addPage();
          yPos = 50;
        }

        const title = item.title || item.name || item.content?.substring(0, 50) || 'Untitled';
        const date = item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Unknown date';
        
        doc.fontSize(10).text(`• ${title} (${date})`, 70, yPos);
        yPos += 15;
      }

      if (items.length > 5) {
        doc.text(`... and ${items.length - 5} more items`, 70, yPos);
        yPos += 15;
      }

      yPos += 20;
    }

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

/**
 * Export to ZIP format (multiple files)
 */
async function exportToZIP(filePath: string, userData: any, options: any): Promise<void> {
  const zip = new JSZip();

  // Add JSON export
  zip.file('complete-export.json', JSON.stringify(userData, null, 2));

  // Add individual CSV files for each content type
  for (const [type, items] of Object.entries(userData)) {
    if (type === 'exportMetadata' || type === 'user' || type === 'totalItems') continue;
    if (!Array.isArray(items) || items.length === 0) continue;

    try {
      const parser = new Parser();
      const csv = parser.parse(items);
      zip.file(`${type}.csv`, csv);
    } catch (error) {
      zip.file(`${type}.txt`, `Error parsing ${type}: ${error}`);
    }
  }

  // Add metadata file
  zip.file('export-info.txt', [
    'Synapse Data Export',
    `Export Date: ${userData.exportMetadata.exportDate}`,
    `Total Items: ${userData.exportMetadata.totalItems}`,
    `Content Types: ${userData.exportMetadata.contentTypes.join(', ')}`,
    `Format: ${userData.exportMetadata.format}`,
    '',
    'Files included:',
    '- complete-export.json: Complete data in JSON format',
    '- [type].csv: Individual content types in CSV format',
    '- export-info.txt: This information file'
  ].join('\n'));

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
  await fs.writeFile(filePath, zipBuffer);
}

/**
 * Get content type for response headers
 */
function getContentType(format: string): string {
  switch (format) {
    case 'json': return 'application/json';
    case 'csv': return 'text/csv';
    case 'pdf': return 'application/pdf';
    case 'zip': return 'application/zip';
    default: return 'application/octet-stream';
  }
}