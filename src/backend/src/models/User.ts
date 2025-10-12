import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

// Interface to represent a User document
export interface IUser extends Document {
  fullName?: string;
  email: string;
  password?: string; // Password might not be present if using OAuth only for a user
  googleId?: string; // For Google OAuth
  role: 'admin' | 'user'; // User role for hierarchy
  isEmailVerified?: boolean; // Email verification status
  emailVerificationToken?: string; // Token for email verification
  emailVerificationExpires?: Date; // Expiration time for verification token
  lastLogin?: Date; // Track last login for analytics
  metadata?: {
    lastIp?: string;
    lastUserAgent?: string;
    registrationIp?: string;
  };
  monitoredTelegramChats?: number[]; // Added for storing Telegram chat IDs to monitor
  sendAgentReportsToTelegram?: boolean; // Toggle for sending agent reports to Telegram
  sendRemindersToTelegram?: boolean; // Toggle for sending bookmark reminders to Telegram (false = email)
  telegramBotToken?: string; // User's personal Telegram bot token
  telegramBotUsername?: string; // Bot username for display purposes
  telegramBotActive?: boolean; // Whether the user's bot is currently active
  
  // WhatsApp session fields
  whatsappSessionId?: string; // Unique session identifier for WAHA (e.g., 'user_123abc')
  whatsappPhoneNumber?: string; // Connected WhatsApp phone number
  whatsappConnected?: boolean; // Whether WhatsApp is currently connected
  whatsappLastConnected?: Date; // Last successful connection timestamp
  whatsappSessionData?: {
    status?: 'STOPPED' | 'STARTING' | 'SCAN_QR_CODE' | 'WORKING' | 'FAILED';
    qrCode?: string; // Store last QR code (temporary, for recovery)
    lastError?: string; // Last error message if any
  };
  
  // Add other fields like profilePicture, etc.
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema: Schema<IUser> = new Schema(
  {
    fullName: {
      type: String,
      required: false, // Or true if you always want a full name
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: function(this: IUser) { // Only required if not using googleId
        return !this.googleId;
      },
      select: false, // By default, don't return password field when querying
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true, // Allows multiple documents without this field to exist (nulls aren't unique)
    },
    role: {
      type: String,
      enum: ['admin', 'user'],
      default: 'user',
      index: true, // Index for efficient admin queries
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      select: false, // Don't return by default for security
    },
    emailVerificationExpires: {
      type: Date,
      select: false, // Don't return by default
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    metadata: {
      lastIp: { type: String },
      lastUserAgent: { type: String },
      registrationIp: { type: String },
    },
    monitoredTelegramChats: {
      type: [Number], // Array of numbers
      default: [],    // Default to an empty array
    },
    sendAgentReportsToTelegram: {
      type: Boolean,
      default: false, // Default to false
    },
    sendRemindersToTelegram: {
      type: Boolean,
      default: true, // Default to true - prefer Telegram over email for reminders
    },
    telegramBotToken: {
      type: String,
      select: false, // Don't return bot token by default for security
    },
    telegramBotUsername: {
      type: String,
    },
    telegramBotActive: {
      type: Boolean,
      default: false,
    },
    
    // WhatsApp session fields
    whatsappSessionId: {
      type: String,
      index: true, // For efficient session lookups
    },
    whatsappPhoneNumber: {
      type: String,
    },
    whatsappConnected: {
      type: Boolean,
      default: false,
      index: true, // For finding active connections
    },
    whatsappLastConnected: {
      type: Date,
    },
    whatsappSessionData: {
      status: {
        type: String,
        enum: ['STOPPED', 'STARTING', 'SCAN_QR_CODE', 'WORKING', 'FAILED'],
      },
      qrCode: {
        type: String,
        select: false, // Don't return QR by default
      },
      lastError: {
        type: String,
      },
    },
    // You can add more fields here as your application grows
    // e.g., profilePictureUrl: String,
    // lastLogin: Date,
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt
);

// Pre-save hook to hash password
UserSchema.pre<IUser>('save', async function (next) {
  // Only hash the password if it has been modified (or is new) and is present
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err: any) {
    next(err);
  }
});

// Method to compare candidate password with the stored hashed password
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.password) {
    return false; // Should not happen if password was required
  }
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model<IUser>('User', UserSchema);

export default User;