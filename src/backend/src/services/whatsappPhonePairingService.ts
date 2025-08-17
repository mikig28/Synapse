import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import * as fs from 'fs-extra';
import * as path from 'path';

interface PairingSession {
  phoneNumber: string;
  code: string;
  qrData?: string;
  createdAt: Date;
  expiresAt: Date;
  status: 'pending' | 'connected' | 'expired';
}

export class WhatsAppPhonePairingService extends EventEmitter {
  private pairingSessions: Map<string, PairingSession> = new Map();
  private codeExpiryMinutes = 3;
  
  constructor() {
    super();
    // Clean up expired sessions every minute
    setInterval(() => this.cleanupExpiredSessions(), 60000);
  }
  
  /**
   * Generate a pairing code for phone number linking
   * This creates a temporary session that maps a code to QR data
   */
  public generatePairingCode(phoneNumber: string): string {
    // Clean up any existing session for this phone
    const existingSession = Array.from(this.pairingSessions.values())
      .find(s => s.phoneNumber === phoneNumber);
    
    if (existingSession) {
      this.pairingSessions.delete(existingSession.code);
    }
    
    // Generate a secure 8-digit code
    const code = this.generateSecureCode();
    
    // Create pairing session
    const session: PairingSession = {
      phoneNumber,
      code,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.codeExpiryMinutes * 60 * 1000),
      status: 'pending'
    };
    
    this.pairingSessions.set(code, session);
    console.log(`[Pairing] Generated code ${code} for ${phoneNumber}`);
    
    return code;
  }
  
  /**
   * Associate QR data with a pairing code
   */
  public associateQRWithCode(code: string, qrData: string): boolean {
    const session = this.pairingSessions.get(code);
    if (!session || session.status !== 'pending') {
      return false;
    }
    
    session.qrData = qrData;
    console.log(`[Pairing] Associated QR data with code ${code}`);
    return true;
  }
  
  /**
   * Get QR data for a pairing code
   * This simulates entering the code on the phone
   */
  public getQRDataForCode(code: string): string | null {
    const session = this.pairingSessions.get(code);
    
    if (!session) {
      console.log(`[Pairing] Code ${code} not found`);
      return null;
    }
    
    if (session.status !== 'pending') {
      console.log(`[Pairing] Code ${code} already used or expired`);
      return null;
    }
    
    if (new Date() > session.expiresAt) {
      session.status = 'expired';
      console.log(`[Pairing] Code ${code} has expired`);
      return null;
    }
    
    return session.qrData || null;
  }
  
  /**
   * Mark a pairing session as connected
   */
  public markSessionConnected(code: string): void {
    const session = this.pairingSessions.get(code);
    if (session) {
      session.status = 'connected';
      console.log(`[Pairing] Session ${code} marked as connected`);
      this.emit('pairing:connected', session);
    }
  }
  
  /**
   * Find session by phone number
   */
  public findSessionByPhone(phoneNumber: string): PairingSession | null {
    return Array.from(this.pairingSessions.values())
      .find(s => s.phoneNumber === phoneNumber && s.status === 'pending') || null;
  }
  
  /**
   * Verify if a code is valid
   */
  public verifyCode(phoneNumber: string, code: string): boolean {
    const session = this.pairingSessions.get(code);
    
    if (!session) {
      return false;
    }
    
    if (session.phoneNumber !== phoneNumber) {
      return false;
    }
    
    if (session.status !== 'pending') {
      return false;
    }
    
    if (new Date() > session.expiresAt) {
      session.status = 'expired';
      return false;
    }
    
    return true;
  }
  
  /**
   * Generate a secure 8-digit code
   */
  private generateSecureCode(): string {
    // Generate a random 4-byte buffer
    const buffer = crypto.randomBytes(4);
    // Convert to number and ensure it's 8 digits
    const num = buffer.readUInt32BE(0);
    const code = String(num).slice(-8).padStart(8, '0');
    
    // Ensure uniqueness
    if (this.pairingSessions.has(code)) {
      return this.generateSecureCode();
    }
    
    return code;
  }
  
  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = new Date();
    let cleaned = 0;
    
    for (const [code, session] of this.pairingSessions.entries()) {
      if (now > session.expiresAt || session.status === 'connected') {
        this.pairingSessions.delete(code);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`[Pairing] Cleaned up ${cleaned} expired sessions`);
    }
  }
  
  /**
   * Get all active sessions (for debugging)
   */
  public getActiveSessions(): PairingSession[] {
    return Array.from(this.pairingSessions.values())
      .filter(s => s.status === 'pending');
  }
}

// Export singleton instance
export default new WhatsAppPhonePairingService();