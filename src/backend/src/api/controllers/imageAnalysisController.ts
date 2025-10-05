import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../types/express';
import TelegramItem from '../../models/TelegramItem';
import WhatsAppImage from '../../models/WhatsAppImage';
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

    // Get Telegram photos with valid GridFS IDs
    const allTelegramPhotos = await TelegramItem.find({
      synapseUserId: userId,
      messageType: 'photo'
    }).lean();

    const telegramImages = allTelegramPhotos.filter(img => 
      img.mediaGridFsId && 
      img.mediaGridFsId !== null && 
      img.mediaGridFsId !== '' &&
      img.mediaGridFsId.length > 0
    );

    // Get WhatsApp images
    const whatsappImages = await WhatsAppImage.find({
      userId: new mongoose.Types.ObjectId(userId),
      status: 'extracted'
    }).lean();

    console.log(`[ImageAnalysis] Found ${telegramImages.length} Telegram images, ${whatsappImages.length} WhatsApp images for user ${userId}`);

    // Combine stats from both sources
    const allImages = [...telegramImages, ...whatsappImages];
    
    const stats = {
      total: allImages.length,
      analyzed: allImages.filter(img => img.aiAnalysis?.isAnalyzed).length,
      pending: allImages.filter(img => !img.aiAnalysis?.isAnalyzed).length,
      byCategory: {} as Record<string, number>,
      bySource: {
        telegram: telegramImages.length,
        whatsapp: whatsappImages.length
      }
    };

    // Count by category
    allImages.forEach(img => {
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

    // Find unanalyzed Telegram images
    const allUnanalyzedTelegram = await TelegramItem.find({
      synapseUserId: userId,
      messageType: 'photo',
      $or: [
        { 'aiAnalysis.isAnalyzed': { $ne: true } },
        { aiAnalysis: { $exists: false } }
      ]
    }).limit(Number(limit) * 2);
    
    // Filter for valid GridFS IDs
    const unanalyzedTelegram = allUnanalyzedTelegram
      .filter(img => img.mediaGridFsId && img.mediaGridFsId !== '' && img.mediaGridFsId.length > 0)
      .slice(0, Math.ceil(Number(limit) / 2)); // Half for Telegram

    // Find unanalyzed WhatsApp images
    const unanalyzedWhatsApp = await WhatsAppImage.find({
      userId: new mongoose.Types.ObjectId(userId),
      status: 'extracted',
      $or: [
        { 'aiAnalysis.isAnalyzed': { $ne: true } },
        { aiAnalysis: { $exists: false } }
      ]
    }).limit(Math.ceil(Number(limit) / 2)); // Half for WhatsApp

    console.log(`[ImageAnalysis] Bulk analyzing ${unanalyzedTelegram.length} Telegram + ${unanalyzedWhatsApp.length} WhatsApp images for user ${userId}`);

    // Process Telegram images
    const telegramPromises = unanalyzedTelegram.map(async (item) => {
      if (!item.mediaGridFsId) {
        console.error(`[ImageAnalysis] Telegram item ${item._id} has no GridFS ID`);
        return { success: false, itemId: item._id, source: 'telegram', error: 'No GridFS ID' };
      }
      
      try {
        console.log(`[ImageAnalysis] Analyzing Telegram image ${item._id} (GridFS: ${item.mediaGridFsId})`);
        const analysis = await imageAnalysisService.analyzeImageFromGridFS(item.mediaGridFsId);
        console.log(`[ImageAnalysis] ✅ Telegram ${item._id}: ${analysis.mainCategory}`);
        
        await TelegramItem.findByIdAndUpdate(item._id, { aiAnalysis: analysis });
        return { success: true, itemId: item._id, source: 'telegram', category: analysis.mainCategory };
      } catch (error: any) {
        console.error(`[ImageAnalysis] ❌ Failed to analyze Telegram ${item._id}:`, error.message);
        return { success: false, itemId: item._id, source: 'telegram', error: error.message };
      }
    });

    // Process WhatsApp images (handle both GridFS and local file paths)
    const whatsappPromises = unanalyzedWhatsApp.map(async (item) => {
      if (!item.localPath) {
        console.error(`[ImageAnalysis] WhatsApp item ${item._id} has no local path`);
        return { success: false, itemId: item._id, source: 'whatsapp', error: 'No local path' };
      }

      try {
        console.log(`[ImageAnalysis] Analyzing WhatsApp image ${item._id} (Path: ${item.localPath})`);

        let analysis;

        // Check if image is stored in GridFS
        if (item.localPath.startsWith('gridfs://')) {
          // Extract GridFS ID and analyze from GridFS
          const gridfsId = item.localPath.replace('gridfs://', '');
          console.log(`[ImageAnalysis] WhatsApp image stored in GridFS: ${gridfsId}`);
          analysis = await imageAnalysisService.analyzeImageFromGridFS(gridfsId);
        } else {
          // Analyze from local file path
          console.log(`[ImageAnalysis] WhatsApp image stored locally: ${item.localPath}`);
          analysis = await imageAnalysisService.analyzeImageFromFile(item.localPath);
        }

        console.log(`[ImageAnalysis] ✅ WhatsApp ${item._id}: ${analysis.mainCategory}`);

        await WhatsAppImage.findByIdAndUpdate(item._id, { aiAnalysis: analysis });
        return { success: true, itemId: item._id, source: 'whatsapp', category: analysis.mainCategory };
      } catch (error: any) {
        console.error(`[ImageAnalysis] ❌ Failed to analyze WhatsApp ${item._id}:`, error.message);
        return { success: false, itemId: item._id, source: 'whatsapp', error: error.message };
      }
    });

    // Wait for all analyses to complete
    const results = await Promise.all([...telegramPromises, ...whatsappPromises]);

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    res.json({
      success: true,
      data: {
        total: results.length,
        successful: successCount,
        failed: failCount,
        telegram: results.filter(r => r.source === 'telegram').length,
        whatsapp: results.filter(r => r.source === 'whatsapp').length,
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
