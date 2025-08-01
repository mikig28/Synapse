import mongoose, { Schema, Document } from 'mongoose';

export interface IPersonProfile extends Document {
  name: string;
  userId: mongoose.Types.ObjectId;
  description?: string;
  faceEmbeddings: number[][];
  trainingImages: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PersonProfileSchema: Schema<IPersonProfile> = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    description: {
      type: String,
      maxlength: 500,
      trim: true
    },
    faceEmbeddings: [{
      type: [Number],
      required: true
    }],
    trainingImages: [{
      type: String,
      required: true
    }],
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true,
    index: [
      { userId: 1, isActive: 1 },
      { name: 1, userId: 1 }
    ]
  }
);

// Compound indexes for efficient queries
PersonProfileSchema.index({ userId: 1, isActive: 1 });
PersonProfileSchema.index({ name: 'text', description: 'text' });

// Static method to get user's active persons
PersonProfileSchema.statics.getActivePersons = function(userId: string) {
  return this.find({
    userId: userId,
    isActive: true
  }).sort({ name: 1 });
};

// Method to add face embedding
PersonProfileSchema.methods.addFaceEmbedding = function(embedding: number[]) {
  this.faceEmbeddings.push(embedding);
  return this.save();
};

// Method to deactivate person
PersonProfileSchema.methods.deactivate = function() {
  this.isActive = false;
  return this.save();
};

const PersonProfile = mongoose.model<IPersonProfile>('PersonProfile', PersonProfileSchema);

export default PersonProfile;