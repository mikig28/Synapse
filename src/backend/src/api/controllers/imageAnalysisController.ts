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

    // Get all photos first, then filter for valid GridFS IDs
    const allPhotos = await TelegramItem.find({
      synapseUserId: userId,
      messageType: 'photo'
    }).lean();

    // Filter for displayable images (has valid GridFS ID)
    const images = allPhotos.filter(img => 
      img.mediaGridFsId && 
      img.mediaGridFsId !== null && 
      img.mediaGridFsId !== '' &&
      img.mediaGridFsId.length > 0
    );

    console.log(`[ImageAnalysis] Found ${allPhotos.length} total photos, ${images.length} displayable for user ${userId}`);
    console.log(`[ImageAnalysis] Sample GridFS IDs:`, images.slice(0, 3).map(i => i.mediaGridFsId));

    const stats = {
      total: images.length,
      analyzed: images.filter(img => img.aiAnalysis?.isAnalyzed).length,
      pending: images.filter(img => !img.aiAnalysis?.isAnalyzed).length,
      byCategory: {} as Record<string, number>,
      bySource: {
        telegram: images.filter(img => img.source === 'telegram' || !img.source).length,
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
      messageType: 'photo'
    });
    
    // Check if it has a valid GridFS ID
    if (!item || !item.mediaGridFsId || item.mediaGridFsId === '' || item.mediaGridFsId.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Image not found or has no valid media file'
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

    // Find unanalyzed images - get all photos first
    const allUnanalyzed = await TelegramItem.find({
      synapseUserId: userId,
      messageType: 'photo',
      $or: [
        { 'aiAnalysis.isAnalyzed': { $ne: true } },
        { aiAnalysis: { $exists: false } }
      ]
    }).limit(Number(limit) * 2); // Get more to ensure we have enough after filtering
    
    // Filter for valid GridFS IDs
    const unanalyzedImages = allUnanalyzed
      .filter(img => img.mediaGridFsId && img.mediaGridFsId !== '' && img.mediaGridFsId.length > 0)
      .slice(0, Number(limit));

    console.log(`[ImageAnalysis] Bulk analyzing ${unanalyzedImages.length} images for user ${userId}`);

    // Start analysis for each image
    const promises = unanalyzedImages.map(async (item) => {
      if (!item.mediaGridFsId) {
        console.error(`[ImageAnalysis] Item ${item._id} has no GridFS ID`);
        return { success: false, itemId: item._id, error: 'No GridFS ID' };
      }
      
      try {
        console.log(`[ImageAnalysis] Starting analysis for ${item._id} (GridFS: ${item.mediaGridFsId})`);
        const analysis = await imageAnalysisService.analyzeImageFromGridFS(item.mediaGridFsId);
        console.log(`[ImageAnalysis] Analysis complete for ${item._id}: ${analysis.mainCategory}`);
        
        await TelegramItem.findByIdAndUpdate(item._id, { aiAnalysis: analysis });
        return { success: true, itemId: item._id, category: analysis.mainCategory };
      } catch (error: any) {
        console.error(`[ImageAnalysis] ❌ Failed to analyze ${item._id}:`, error.message);
        console.error('[ImageAnalysis] Full error:', error);
        return { success: false, itemId: item._id, error: error.message, stack: error.stack?.substring(0, 200) };
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


