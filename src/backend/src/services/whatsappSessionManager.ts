/**
 * WhatsApp Session Manager
 * 
 * Manages multiple WhatsApp sessions (one per user) using WAHA service.
 * Similar architecture to TelegramBotManager but for WhatsApp.
 * 
 * Features:
 * - Per-user WhatsApp sessions
 * - Automatic session lifecycle management
 * - QR code generation per user
 * - Session status tracking
 * - Automatic cleanup of inactive sessions
 */

import { EventEmitter } from 'events';
import WAHAService from './wahaService';
import User, { IUser } from '../models/User';
import logger from '../config/logger';

interface UserSession {
  userId: string;
  sessionId: string;
  wahaService: WAHAService;
  lastActivity: Date;
  status: 'STOPPED' | 'STARTING' | 'SCAN_QR_CODE' | 'WORKING' | 'FAILED';
}

interface SessionValidationResult {
  valid: boolean;
  sessionId?: string;
  error?: string;
}

class WhatsAppSessionManager extends EventEmitter {
  private static instance: WhatsAppSessionManager | null = null;
  private sessions: Map<string, UserSession> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly CLEANUP_INTERVAL = 30 * 60 * 1000; // 30 minutes
  private readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours of inactivity

  private constructor() {
    super();
    this.startCleanupRoutine();
    logger.info('[WhatsAppSessionManager] Initialized');
  }

  /**
   * Get singleton instance
   */
  static getInstance(): WhatsAppSessionManager {
    if (!this.instance) {
      this.instance = new WhatsAppSessionManager();
    }
    return this.instance;
  }

  /**
   * Generate unique session ID for user
   * WAHA-PLUS requires alphanumeric names only (no special chars except underscore)
   */
  private generateSessionId(userId: string): string {
    // Use just the user ID - it's already unique (MongoDB ObjectId)
    // Remove any non-alphanumeric characters except underscores
    const cleanUserId = userId.replace(/[^a-zA-Z0-9_]/g, '');
    return `user_${cleanUserId}`;
  }

  /**
   * Get or create session for user
   */
  async getSessionForUser(userId: string): Promise<WAHAService> {
    try {
      // Check if session already exists
      if (this.sessions.has(userId)) {
        const session = this.sessions.get(userId)!;
        session.lastActivity = new Date();
        logger.debug(`[WhatsAppSessionManager] Returning existing session for user ${userId}`);
        return session.wahaService;
      }

      // Create new session
      logger.info(`[WhatsAppSessionManager] Creating new session for user ${userId}`);
      
      // Get or create session ID from user document
      let user = await User.findById(userId);
      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      let sessionId = user.whatsappSessionId;
      if (!sessionId) {
        sessionId = this.generateSessionId(userId);
        user.whatsappSessionId = sessionId;
        await user.save();
        logger.info(`[WhatsAppSessionManager] Generated new session ID: ${sessionId} for user ${userId}`);
      }

      // Create WAHA service instance for this user
      const wahaService = new WAHAService(sessionId);
      
      // Set up event listeners for this session
      this.setupSessionEventListeners(userId, sessionId, wahaService);

      // Store session
      const session: UserSession = {
        userId,
        sessionId,
        wahaService,
        lastActivity: new Date(),
        status: 'STOPPED'
      };
      
      this.sessions.set(userId, session);
      logger.info(`[WhatsAppSessionManager] Session created for user ${userId} with ID ${sessionId}`);

      return wahaService;
    } catch (error) {
      logger.error(`[WhatsAppSessionManager] Error getting session for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Set up event listeners for a user's session
   */
  private setupSessionEventListeners(userId: string, sessionId: string, wahaService: WAHAService): void {
    // Listen for status changes
    wahaService.on('status', async (status) => {
      logger.info(`[WhatsAppSessionManager] Session ${sessionId} status: ${status.status}`);
      
      // Update session status
      const session = this.sessions.get(userId);
      if (session) {
        session.status = status.status;
        session.lastActivity = new Date();
      }

      // Update user document
      try {
        await User.findByIdAndUpdate(userId, {
          whatsappConnected: status.status === 'WORKING',
          'whatsappSessionData.status': status.status,
          whatsappLastConnected: status.status === 'WORKING' ? new Date() : undefined
        });
      } catch (error) {
        logger.error(`[WhatsAppSessionManager] Error updating user status:`, error);
      }

      // Emit event for this specific user
      this.emit(`session:status:${userId}`, status);
    });

    // Listen for QR codes
    wahaService.on('qr', async (qrData) => {
      logger.info(`[WhatsAppSessionManager] QR code generated for session ${sessionId}`);
      
      // Emit event for this specific user
      this.emit(`session:qr:${userId}`, qrData);
    });

    // Listen for messages (for webhook-style processing)
    wahaService.on('message', (messageData) => {
      const session = this.sessions.get(userId);
      if (session) {
        session.lastActivity = new Date();
      }
      
      // Emit event for this specific user
      this.emit(`session:message:${userId}`, messageData);
    });

    logger.info(`[WhatsAppSessionManager] Event listeners set up for session ${sessionId}`);
  }

  /**
   * Get session ID for user
   */
  getSessionIdForUser(userId: string): string | null {
    const session = this.sessions.get(userId);
    return session ? session.sessionId : null;
  }

  /**
   * Get user ID by session ID (for webhook routing)
   */
  getUserIdBySessionId(sessionId: string): string | null {
    for (const [userId, session] of this.sessions.entries()) {
      if (session.sessionId === sessionId) {
        return userId;
      }
    }
    return null;
  }

  /**
   * Check if user has active session
   */
  hasActiveSession(userId: string): boolean {
    return this.sessions.has(userId);
  }

  /**
   * Get session status for user
   */
  getSessionStatus(userId: string): string | null {
    const session = this.sessions.get(userId);
    return session ? session.status : null;
  }

  /**
   * Stop session for user
   */
  async stopSessionForUser(userId: string): Promise<void> {
    try {
      const session = this.sessions.get(userId);
      if (!session) {
        logger.warn(`[WhatsAppSessionManager] No active session found for user ${userId}`);
        return;
      }

      logger.info(`[WhatsAppSessionManager] Stopping session for user ${userId}`);
      
      // Stop the WAHA session
      try {
        await session.wahaService.stopSession(session.sessionId);
      } catch (error) {
        logger.error(`[WhatsAppSessionManager] Error stopping WAHA session:`, error);
      }

      // Remove from active sessions
      this.sessions.delete(userId);

      // Update user document
      await User.findByIdAndUpdate(userId, {
        whatsappConnected: false,
        'whatsappSessionData.status': 'STOPPED'
      });

      logger.info(`[WhatsAppSessionManager] Session stopped for user ${userId}`);
      this.emit(`session:stopped:${userId}`);
    } catch (error) {
      logger.error(`[WhatsAppSessionManager] Error stopping session for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Restart session for user
   */
  async restartSessionForUser(userId: string): Promise<void> {
    try {
      logger.info(`[WhatsAppSessionManager] Restarting session for user ${userId}`);
      
      // Stop existing session
      await this.stopSessionForUser(userId);
      
      // Get new session (will create if needed)
      await this.getSessionForUser(userId);
      
      logger.info(`[WhatsAppSessionManager] Session restarted for user ${userId}`);
    } catch (error) {
      logger.error(`[WhatsAppSessionManager] Error restarting session for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Start cleanup routine for inactive sessions
   */
  private startCleanupRoutine(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveSessions();
    }, this.CLEANUP_INTERVAL);

    logger.info('[WhatsAppSessionManager] Cleanup routine started');
  }

  /**
   * Clean up inactive sessions
   */
  private async cleanupInactiveSessions(): Promise<void> {
    try {
      const now = Date.now();
      const sessionsToCleanup: string[] = [];

      for (const [userId, session] of this.sessions.entries()) {
        const inactiveTime = now - session.lastActivity.getTime();
        
        if (inactiveTime > this.SESSION_TIMEOUT) {
          sessionsToCleanup.push(userId);
          logger.info(`[WhatsAppSessionManager] Marking session for cleanup: ${userId} (inactive for ${Math.round(inactiveTime / 1000 / 60)} minutes)`);
        }
      }

      // Clean up marked sessions
      for (const userId of sessionsToCleanup) {
        try {
          await this.stopSessionForUser(userId);
          logger.info(`[WhatsAppSessionManager] Cleaned up inactive session for user ${userId}`);
        } catch (error) {
          logger.error(`[WhatsAppSessionManager] Error cleaning up session for user ${userId}:`, error);
        }
      }

      if (sessionsToCleanup.length > 0) {
        logger.info(`[WhatsAppSessionManager] Cleanup complete: ${sessionsToCleanup.length} sessions cleaned`);
      }
    } catch (error) {
      logger.error('[WhatsAppSessionManager] Error during cleanup routine:', error);
    }
  }

  /**
   * Get all active sessions (for monitoring)
   */
  getActiveSessions(): Array<{userId: string; sessionId: string; status: string; lastActivity: Date}> {
    return Array.from(this.sessions.entries()).map(([userId, session]) => ({
      userId,
      sessionId: session.sessionId,
      status: session.status,
      lastActivity: session.lastActivity
    }));
  }

  /**
   * Get session count
   */
  getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Shutdown all sessions (for graceful server shutdown)
   */
  async shutdownAll(): Promise<void> {
    logger.info('[WhatsAppSessionManager] Shutting down all sessions...');
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    const userIds = Array.from(this.sessions.keys());
    
    for (const userId of userIds) {
      try {
        await this.stopSessionForUser(userId);
      } catch (error) {
        logger.error(`[WhatsAppSessionManager] Error stopping session during shutdown for user ${userId}:`, error);
      }
    }

    logger.info('[WhatsAppSessionManager] All sessions shut down');
  }

  /**
   * Validate and recover session from database
   */
  async validateAndRecoverSession(userId: string): Promise<SessionValidationResult> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return { valid: false, error: 'User not found' };
      }

      if (!user.whatsappSessionId) {
        return { valid: false, error: 'No session ID found' };
      }

      // Check if session exists in WAHA
      const wahaService = await this.getSessionForUser(userId);
      const status = await wahaService.getSessionStatus(user.whatsappSessionId);

      if (status.status === 'WORKING') {
        return { valid: true, sessionId: user.whatsappSessionId };
      }

      return { 
        valid: false, 
        sessionId: user.whatsappSessionId,
        error: `Session in ${status.status} state`
      };
    } catch (error: any) {
      logger.error(`[WhatsAppSessionManager] Error validating session for user ${userId}:`, error);
      return { valid: false, error: error.message };
    }
  }
}

// Export singleton instance
export default WhatsAppSessionManager;

// Export class for typing
export { WhatsAppSessionManager, UserSession, SessionValidationResult };

