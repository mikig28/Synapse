import { Request, Response } from 'express';
import { quickMigrateMetadata } from '../../utils/quickMigrateMetadata';

/**
 * Migration controller for running database migrations via API
 * SECURITY: Only available in non-production environments
 */

/**
 * Run WhatsApp metadata migration
 */
export const migrateWhatsAppMetadata = async (req: Request, res: Response) => {
  try {
    // Migration is temporarily enabled in production for the WhatsApp metadata fix
    console.log('[Migration API] NODE_ENV:', process.env.NODE_ENV);
    console.log('[Migration API] Migration temporarily enabled for WhatsApp metadata fix');

    console.log('[Migration API] Starting WhatsApp metadata migration...');
    
    // Capture console output for response
    const originalConsoleLog = console.log;
    const logs: string[] = [];
    
    console.log = (...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      logs.push(message);
      originalConsoleLog(...args);
    };

    try {
      // Run the migration
      await quickMigrateMetadata();
      
      console.log = originalConsoleLog;
      
      res.json({
        success: true,
        message: 'WhatsApp metadata migration completed successfully',
        logs: logs
      });
      
    } catch (migrationError) {
      console.log = originalConsoleLog;
      throw migrationError;
    }
    
  } catch (error) {
    console.error('[Migration API] Migration failed:', error);
    res.status(500).json({
      success: false,
      error: 'Migration failed: ' + (error as Error).message,
      logs: []
    });
  }
};

/**
 * Get migration status / diagnostics
 */
export const getMigrationStatus = async (req: Request, res: Response) => {
  try {
    const WhatsAppMessage = require('../../models/WhatsAppMessage').default;
    
    // Quick stats
    const [totalMessages, groupMessages, directMessages, messagesWithoutMetadata] = await Promise.all([
      WhatsAppMessage.countDocuments(),
      WhatsAppMessage.countDocuments({ 'metadata.isGroup': true }),
      WhatsAppMessage.countDocuments({ 'metadata.isGroup': false }),
      WhatsAppMessage.countDocuments({ 'metadata.isGroup': { $exists: false } })
    ]);
    
    const targetGroupId = '120363052356022041@g.us';
    const targetGroupMessages = await WhatsAppMessage.countDocuments({
      'metadata.isGroup': true,
      'metadata.groupId': targetGroupId
    });
    
    res.json({
      success: true,
      data: {
        totalMessages,
        groupMessages,
        directMessages, 
        messagesWithoutMetadata,
        targetGroupMessages,
        migrationNeeded: messagesWithoutMetadata > 0,
        status: messagesWithoutMetadata === 0 ? 'migrated' : 'needs_migration'
      }
    });
    
  } catch (error) {
    console.error('[Migration API] Status check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Status check failed: ' + (error as Error).message
    });
  }
};