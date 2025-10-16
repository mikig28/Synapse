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
  createdAt: Date; // Track when session was created
  qrScanWaitingStartedAt?: Date; // Track when we started waiting for QR scan
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
  private readonly CLEANUP_INTERVAL = 15 * 60 * 1000; // 15 minutes
  private readonly INACTIVE_TIMEOUT = 48 * 60 * 60 * 1000; // 48 hours of inactivity (only cleanup truly inactive users)
  private readonly MAX_CONCURRENT_SESSIONS = 10; // Limit total sessions to control memory

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
   *
   * CRITICAL: MongoDB Atlas has 38-byte database name limit
   * WAHA adds prefix: waha_webjs_ (11 chars) or waha_noweb_ (11 chars)
   * So session name must be <= 27 characters to stay under limit
   *
   * Format: u_{first12chars} = 14 characters
   * Total DB name: waha_webjs_u_{first12chars} = 25 characters ✅
   */
  private generateSessionId(userId: string): string {
    // Use just first 12 characters of user ID (still unique enough)
    // MongoDB ObjectId is 24 hex chars, first 12 is timestamp + machine ID
    const shortId = userId.substring(0, 12);
    return `u_${shortId}`;
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

      // Create WAHA service instance for this user with userId for database operations
      const wahaService = new WAHAService(sessionId, userId);

      // Set up event listeners for this session
      this.setupSessionEventListeners(userId, sessionId, wahaService);

      // Store session
      const session: UserSession = {
        userId,
        sessionId,
        wahaService,
        lastActivity: new Date(),
        status: 'STOPPED',
        createdAt: new Date() // Track creation time
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

        // Track when we start waiting for QR scan
        if (status.status === 'SCAN_QR_CODE' && !session.qrScanWaitingStartedAt) {
          session.qrScanWaitingStartedAt = new Date();
          logger.info(`[WhatsAppSessionManager] Session ${sessionId} entered QR scan state`);
        }

        // Clear QR waiting timer if session becomes WORKING or FAILED
        if ((status.status === 'WORKING' || status.status === 'FAILED') && session.qrScanWaitingStartedAt) {
          session.qrScanWaitingStartedAt = undefined;
        }
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
   * Clean up inactive sessions - SMART CLEANUP STRATEGY
   *
   * Strategy:
   * 1. NEVER cleanup WORKING sessions (users expect persistent WhatsApp connection)
   * 2. Cleanup FAILED sessions immediately (they're broken anyway)
   * 3. Cleanup STOPPED/STARTING/SCAN_QR_CODE sessions only after 1 hour (allow time for QR scanning)
   * 4. Cleanup truly inactive sessions (48h+ with no activity)
   * 5. If over MAX_CONCURRENT_SESSIONS, remove oldest inactive sessions
   */
  private async cleanupInactiveSessions(): Promise<void> {
    try {
      const now = Date.now();
      const sessionsToCleanup: string[] = [];
      const ONE_HOUR = 60 * 60 * 1000; // 1 hour in milliseconds
      const FIVE_MINUTES = 5 * 60 * 1000; // 5 minutes for QR scanning

      // Log current session count and memory usage
      const totalSessions = this.sessions.size;
      const memoryUsage = process.memoryUsage();
      logger.info(`[WhatsAppSessionManager] Cleanup check: ${totalSessions} active sessions, Memory: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB used`);

      // Strategy 1: Clean up FAILED sessions immediately (they're broken)
      for (const [userId, session] of this.sessions.entries()) {
        if (session.status === 'FAILED') {
          sessionsToCleanup.push(userId);
          logger.info(`[WhatsAppSessionManager] Marking failed session for cleanup: ${userId}`);
        }
      }

      // Strategy 2: Clean up STOPPED sessions only after 1 hour (not immediately!)
      // This allows users time to scan QR codes and authenticate
      for (const [userId, session] of this.sessions.entries()) {
        if (session.status === 'STOPPED') {
          const sessionAge = now - session.createdAt.getTime();
          if (sessionAge > ONE_HOUR) {
            if (!sessionsToCleanup.includes(userId)) {
              sessionsToCleanup.push(userId);
              logger.info(`[WhatsAppSessionManager] Marking old STOPPED session for cleanup: ${userId} (age: ${Math.round(sessionAge / 1000 / 60)} minutes)`);
            }
          } else {
            logger.debug(`[WhatsAppSessionManager] Preserving new STOPPED session: ${userId} (age: ${Math.round(sessionAge / 1000 / 60)} minutes)`);
          }
        }
      }

      // Strategy 3: Clean up SCAN_QR_CODE sessions after 5 minutes of waiting
      // (Give user 5 minutes to scan QR, then assume they abandoned it)
      for (const [userId, session] of this.sessions.entries()) {
        if (session.status === 'SCAN_QR_CODE' && session.qrScanWaitingStartedAt) {
          const waitTime = now - session.qrScanWaitingStartedAt.getTime();
          if (waitTime > FIVE_MINUTES) {
            if (!sessionsToCleanup.includes(userId)) {
              sessionsToCleanup.push(userId);
              logger.info(`[WhatsAppSessionManager] Marking abandoned QR scan session for cleanup: ${userId} (waited: ${Math.round(waitTime / 1000 / 60)} minutes)`);
            }
          }
        }
      }

      // Strategy 4: Clean up truly inactive sessions (48h+ with no activity)
      // BUT: Never cleanup WORKING sessions regardless of inactivity (users expect persistence)
      for (const [userId, session] of this.sessions.entries()) {
        const inactiveTime = now - session.lastActivity.getTime();

        if (inactiveTime > this.INACTIVE_TIMEOUT && session.status !== 'WORKING') {
          if (!sessionsToCleanup.includes(userId)) {
            sessionsToCleanup.push(userId);
            logger.info(`[WhatsAppSessionManager] Marking truly inactive session for cleanup: ${userId} (inactive for ${Math.round(inactiveTime / 1000 / 60 / 60)} hours, status: ${session.status})`);
          }
        }
      }

      // Strategy 5: If over MAX_CONCURRENT_SESSIONS, remove oldest inactive sessions
      // Prioritize keeping WORKING sessions
      if (this.sessions.size > this.MAX_CONCURRENT_SESSIONS) {
        logger.warn(`[WhatsAppSessionManager] Over session limit (${this.sessions.size}/${this.MAX_CONCURRENT_SESSIONS}), cleaning up oldest inactive sessions`);

        // Get all sessions sorted by last activity (oldest first), excluding WORKING sessions
        const inactiveSessions = Array.from(this.sessions.entries())
          .filter(([userId, session]) => session.status !== 'WORKING' && !sessionsToCleanup.includes(userId))
          .sort(([, a], [, b]) => a.lastActivity.getTime() - b.lastActivity.getTime());

        const excessCount = this.sessions.size - this.MAX_CONCURRENT_SESSIONS;
        for (let i = 0; i < Math.min(excessCount, inactiveSessions.length); i++) {
          const [userId] = inactiveSessions[i];
          if (!sessionsToCleanup.includes(userId)) {
            sessionsToCleanup.push(userId);
            logger.info(`[WhatsAppSessionManager] Marking excess session for cleanup: ${userId}`);
          }
        }
      }

      // Execute cleanup
      for (const userId of sessionsToCleanup) {
        try {
          await this.stopSessionForUser(userId);
          logger.info(`[WhatsAppSessionManager] Cleaned up session for user ${userId}`);
        } catch (error) {
          logger.error(`[WhatsAppSessionManager] Error cleaning up session for user ${userId}:`, error);
        }
      }

      if (sessionsToCleanup.length > 0) {
        const memoryAfter = process.memoryUsage();
        logger.info(`[WhatsAppSessionManager] Cleanup complete: ${sessionsToCleanup.length} sessions cleaned, ${totalSessions - sessionsToCleanup.length} remaining, Memory: ${Math.round(memoryAfter.heapUsed / 1024 / 1024)}MB used`);
      }

      // Emergency memory cleanup if still high
      const heapUsedPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
      if (heapUsedPercent > 85 && this.sessions.size > 5) {
        logger.warn(`[WhatsAppSessionManager] CRITICAL memory usage (${Math.round(heapUsedPercent)}%), triggering emergency cleanup`);
        await this.forceCleanupOldestSessions(5); // Keep only 5 most recent sessions in emergency
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
   * Force aggressive cleanup of oldest/idle sessions
   * Used when WAHA service memory is critical
   */
  async forceCleanupOldestSessions(maxSessions: number = 5): Promise<number> {
    try {
      logger.warn(`[WhatsAppSessionManager] Force cleanup triggered - keeping only ${maxSessions} most recent sessions`);

      // Get all sessions sorted by last activity (oldest first)
      const sortedSessions = Array.from(this.sessions.entries())
        .sort(([, a], [, b]) => a.lastActivity.getTime() - b.lastActivity.getTime());

      // Calculate how many to remove
      const sessionsToRemove = Math.max(0, sortedSessions.length - maxSessions);

      if (sessionsToRemove === 0) {
        logger.info('[WhatsAppSessionManager] No sessions to clean up');
        return 0;
      }

      logger.warn(`[WhatsAppSessionManager] Cleaning up ${sessionsToRemove} oldest sessions (total: ${sortedSessions.length})`);

      // Remove oldest sessions
      let cleanedCount = 0;
      for (let i = 0; i < sessionsToRemove; i++) {
        const [userId, session] = sortedSessions[i];
        const inactiveMinutes = Math.round((Date.now() - session.lastActivity.getTime()) / 1000 / 60);

        try {
          logger.warn(`[WhatsAppSessionManager] Force stopping session ${userId} (inactive ${inactiveMinutes}min, status: ${session.status})`);
          await this.stopSessionForUser(userId);
          cleanedCount++;
        } catch (error) {
          logger.error(`[WhatsAppSessionManager] Error force stopping session ${userId}:`, error);
        }
      }

      logger.info(`[WhatsAppSessionManager] Force cleanup complete: ${cleanedCount}/${sessionsToRemove} sessions cleaned`);
      return cleanedCount;
    } catch (error) {
      logger.error('[WhatsAppSessionManager] Error during force cleanup:', error);
      return 0;
    }
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

