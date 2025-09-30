import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../types/express';
import TelegramItem from '../../models/TelegramItem';
import imageAnalysisService, { ImageAnalysisService } from '../../services/imageAnalysisService';
import mongoose from 'mongoose';

/**
 * Get all available image categories
 */
export const getImageCategories = async (req: Request, res: Response) => {
  try {
    const categories = ImageAnalysisService.getCategories();
    res.json({
      success: true,
      data: categories
    });
  } catch (error: any) {
    console.error('[ImageAnalysis] Error getting categories:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get categories'
    });
  }
};

/**
 * Get image statistics for a user
 */
export const getImageStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const userId = req.user.id;

    // Get counts by category - only photos with GridFS ID (displayable)
    const images = await TelegramItem.find({
      synapseUserId: userId,
      messageType: 'photo',
      mediaGridFsId: { $exists: true, $ne: null, $ne: '' }
    });

    const stats = {
      total: images.length,
      analyzed: images.filter(img => img.aiAnalysis?.isAnalyzed).length,
      pending: images.filter(img => !img.aiAnalysis?.isAnalyzed).length,
      byCategory: {} as Record<string, number>,
      bySource: {
        telegram: images.filter(img => img.source === 'telegram').length,
        whatsapp: images.filter(img => img.source === 'whatsapp').length
      }
    };

    // Count by category
    images.forEach(img => {
      if (img.aiAnalysis?.mainCategory) {
        stats.byCategory[img.aiAnalysis.mainCategory] = 
          (stats.byCategory[img.aiAnalysis.mainCategory] || 0) + 1;
      }
    });

    res.json({
      success: true,
      data: stats
    });

  } catch (error: any) {
    console.error('[ImageAnalysis] Error getting stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get statistics'
    });
  }
};

/**
 * Reanalyze a specific image
 */
export const reanalyzeImage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const { itemId } = req.params;
    const userId = req.user.id;

    // Find the image
    const item = await TelegramItem.findOne({
      _id: itemId,
      synapseUserId: userId,
      messageType: 'photo',
      mediaGridFsId: { $exists: true, $ne: null, $ne: '' }
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Image not found or not authorized'
      });
    }

    if (!item.mediaGridFsId) {
      return res.status(400).json({
        success: false,
        error: 'Image has no GridFS ID'
      });
    }

    console.log(`[ImageAnalysis] Reanalyzing image ${itemId} (GridFS: ${item.mediaGridFsId})`);

    // Analyze the image
    const analysis = await imageAnalysisService.analyzeImageFromGridFS(item.mediaGridFsId);

    // Update the item
    item.aiAnalysis = analysis;
    await item.save();

    res.json({
      success: true,
      data: {
        itemId,
        analysis
      }
    });

  } catch (error: any) {
    console.error('[ImageAnalysis] Error reanalyzing image:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to reanalyze image'
    });
  }
};

/**
 * Bulk analyze all unanalyzed images for a user
 */
export const bulkAnalyzeImages = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const userId = req.user.id;
    const { limit = 10 } = req.query; // Limit to avoid timeout

    // Find unanalyzed images
    const unanalyzedImages = await TelegramItem.find({
      synapseUserId: userId,
      messageType: 'photo',
      mediaGridFsId: { $exists: true, $ne: null, $ne: '' },
      $or: [
        { 'aiAnalysis.isAnalyzed': { $ne: true } },
        { aiAnalysis: { $exists: false } }
      ]
    }).limit(Number(limit));

    console.log(`[ImageAnalysis] Bulk analyzing ${unanalyzedImages.length} images for user ${userId}`);

    // Start analysis for each image (don't wait)
    const promises = unanalyzedImages.map(async (item) => {
      if (!item.mediaGridFsId) return { success: false, itemId: item._id, error: 'No GridFS ID' };
      
      try {
        const analysis = await imageAnalysisService.analyzeImageFromGridFS(item.mediaGridFsId);
        await TelegramItem.findByIdAndUpdate(item._id, { aiAnalysis: analysis });
        return { success: true, itemId: item._id, category: analysis.mainCategory };
      } catch (error: any) {
        console.error(`[ImageAnalysis] Failed to analyze ${item._id}:`, error);
        return { success: false, itemId: item._id, error: error.message };
      }
    });

    // Wait for all analyses to complete
    const results = await Promise.all(promises);

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    res.json({
      success: true,
      data: {
        total: results.length,
        successful: successCount,
        failed: failCount,
        results
      }
    });

  } catch (error: any) {
    console.error('[ImageAnalysis] Error in bulk analysis:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to bulk analyze images'
    });
  }
};


