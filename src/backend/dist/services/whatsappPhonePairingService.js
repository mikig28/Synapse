"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppPhonePairingService = void 0;
const events_1 = require("events");
const crypto = __importStar(require("crypto"));
class WhatsAppPhonePairingService extends events_1.EventEmitter {
    constructor() {
        super();
        this.pairingSessions = new Map();
        this.codeExpiryMinutes = 3;
        // Clean up expired sessions every minute
        setInterval(() => this.cleanupExpiredSessions(), 60000);
    }
    /**
     * Generate a pairing code for phone number linking
     * This creates a temporary session that maps a code to QR data
     */
    generatePairingCode(phoneNumber) {
        // Clean up any existing session for this phone
        const existingSession = Array.from(this.pairingSessions.values())
            .find(s => s.phoneNumber === phoneNumber);
        if (existingSession) {
            this.pairingSessions.delete(existingSession.code);
        }
        // Generate a secure 8-digit code
        const code = this.generateSecureCode();
        // Create pairing session
        const session = {
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
    associateQRWithCode(code, qrData) {
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
    getQRDataForCode(code) {
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
    markSessionConnected(code) {
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
    findSessionByPhone(phoneNumber) {
        return Array.from(this.pairingSessions.values())
            .find(s => s.phoneNumber === phoneNumber && s.status === 'pending') || null;
    }
    /**
     * Verify if a code is valid
     */
    verifyCode(phoneNumber, code) {
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
    generateSecureCode() {
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
    cleanupExpiredSessions() {
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
    getActiveSessions() {
        return Array.from(this.pairingSessions.values())
            .filter(s => s.status === 'pending');
    }
}
exports.WhatsAppPhonePairingService = WhatsAppPhonePairingService;
// Export singleton instance
exports.default = new WhatsAppPhonePairingService();
