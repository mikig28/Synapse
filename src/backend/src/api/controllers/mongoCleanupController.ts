/**
 * MongoDB Cleanup Controller
 * Admin endpoints for managing database cleanup operations
 */

import { Request, Response } from 'express';
import { mongoCleanupService } from '../../services/mongoCleanupService';

/**
 * Get cleanup statistics and status
 */
export const getCleanupStats = async (req: Request, res: Response) => {
  try {
    const stats = mongoCleanupService.getStats();
    const collectionSizes = await mongoCleanupService.getCollectionSizes();

    res.json({
      success: true,
      data: {
        ...stats,
        collectionSizes
      }
    });
  } catch (error) {
    console.error('[Cleanup Controller] Error getting stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cleanup statistics'
    });
  }
};

/**
 * Trigger manual cleanup
 */
export const runCleanup = async (req: Request, res: Response) => {
  try {
    console.log('[Cleanup Controller] Manual cleanup triggered');
    
    const stats = await mongoCleanupService.runCleanup();
    
    res.json({
      success: true,
      message: 'Cleanup completed successfully',
      data: stats
    });
  } catch (error: any) {
    console.error('[Cleanup Controller] Error running cleanup:', error);
    
    if (error.message === 'Cleanup already in progress') {
      res.status(409).json({
        success: false,
        error: 'Cleanup is already in progress'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to run cleanup: ' + error.message
      });
    }
  }
};

/**
 * Trigger emergency cleanup (aggressive 7-day retention)
 */
export const runEmergencyCleanup = async (req: Request, res: Response) => {
  try {
    console.log('[Cleanup Controller] 🚨 EMERGENCY CLEANUP triggered');
    
    // Require admin confirmation
    const confirmCode = req.body.confirmCode || req.query.confirmCode;
    if (confirmCode !== 'EMERGENCY_CLEANUP_CONFIRMED') {
      return res.status(400).json({
        success: false,
        error: 'Emergency cleanup requires confirmation',
        hint: 'Include confirmCode: "EMERGENCY_CLEANUP_CONFIRMED" in request body'
      });
    }
    
    const stats = await mongoCleanupService.emergencyCleanup();
    
    res.json({
      success: true,
      message: 'Emergency cleanup completed successfully',
      warning: 'Used aggressive 7-day retention for messages',
      data: stats
    });
  } catch (error: any) {
    console.error('[Cleanup Controller] Error running emergency cleanup:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run emergency cleanup: ' + error.message
    });
  }
};

/**
 * Get database collection sizes
 */
export const getCollectionSizes = async (req: Request, res: Response) => {
  try {
    const sizes = await mongoCleanupService.getCollectionSizes();
    
    res.json({
      success: true,
      data: sizes
    });
  } catch (error) {
    console.error('[Cleanup Controller] Error getting collection sizes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get collection sizes'
    });
  }
};
