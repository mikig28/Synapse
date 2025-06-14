import mongoose, { Schema, Document } from 'mongoose';

export interface ITelegramItem extends Document {
  synapseUserId?: mongoose.Types.ObjectId; // ID of the Synapse user who owns this captured item
  telegramMessageId: number;
  chatId: number;
  chatTitle?: string;
  fromUserId?: number;
  fromUsername?: string;
  text?: string;
  urls?: string[]; // Added to store extracted URLs
  messageType: string; // e.g., 'text', 'photo', 'document', 'voice'
  mediaFileId?: string; // Telegram file_id for media
  mediaGridFsId?: string; // GridFS file ID if we download and store media
  receivedAt: Date;
  // Add other relevant fields as needed
}

const TelegramItemSchema: Schema<ITelegramItem> = new Schema(
  {
    synapseUserId: { type: Schema.Types.ObjectId, ref: 'User', required: false }, // Link to Synapse User
    telegramMessageId: { type: Number, required: true },
    chatId: { type: Number, required: true },
    chatTitle: { type: String },
    fromUserId: { type: Number },
    fromUsername: { type: String },
    text: { type: String },
    urls: { type: [String], default: [] }, // Added urls field
    messageType: { type: String, required: true, default: 'text' },
    mediaFileId: { type: String }, // For later use if we download media
    mediaGridFsId: { type: String }, // For later use
    receivedAt: { type: Date, default: Date.now },
  },
  { timestamps: true } // Adds createdAt and updatedAt for the DB record itself
);

// Index for efficient querying, e.g., by messageId and chatId to avoid duplicates if needed
TelegramItemSchema.index({ telegramMessageId: 1, chatId: 1 }, { unique: false }); // unique: false, as edits create new messages
TelegramItemSchema.index({ synapseUserId: 1, receivedAt: -1 });

const TelegramItem = mongoose.model<ITelegramItem>('TelegramItem', TelegramItemSchema);

export default TelegramItem; 