import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

// Interface to represent a User document
export interface IUser extends Document {
  fullName?: string;
  email: string;
  password?: string; // Password might not be present if using OAuth only for a user
  googleId?: string; // For Google OAuth
  monitoredTelegramChats?: number[]; // Added for storing Telegram chat IDs to monitor
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
    monitoredTelegramChats: {
      type: [Number], // Array of numbers
      default: [],    // Default to an empty array
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