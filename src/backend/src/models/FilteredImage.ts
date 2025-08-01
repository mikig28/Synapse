import mongoose, { Schema, Document } from 'mongoose';

export interface IFilteredImage extends Document {
  messageId: string;
  groupId: string;
  groupName: string;
  userId: mongoose.Types.ObjectId;
  senderId: string;
  senderName: string;
  imageUrl: string;
  originalCaption?: string;
  detectedPersons: {
    personId: mongoose.Types.ObjectId;
    personName: string;
    confidence: number;
    boundingBox: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }[];
  processingDetails: {
    facesDetected: number;
    processingTime: number;
    algorithm: string;
    status: 'processed' | 'failed' | 'pending';
    error?: string;
  };
  metadata: {
    imageSize: number;
    imageDimensions: {
      width: number;
      height: number;
    };
    mimeType: string;
  };
  isNotified: boolean;
  isArchived: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  markAsNotified(): Promise<IFilteredImage>;
  archive(): Promise<IFilteredImage>;
  addTag(tag: string): Promise<IFilteredImage>;
}

const FilteredImageSchema: Schema<IFilteredImage> = new Schema(
  {
    messageId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    groupId: {
      type: String,
      required: true,
      index: true
    },
    groupName: {
      type: String,
      required: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    senderId: {
      type: String,
      required: true,
      index: true
    },
    senderName: {
      type: String,
      required: true
    },
    imageUrl: {
      type: String,
      required: true
    },
    originalCaption: {
      type: String,
      maxlength: 1000
    },
    detectedPersons: [{
      personId: {
        type: Schema.Types.ObjectId,
        ref: 'PersonProfile',
        required: true
      },
      personName: {
        type: String,
        required: true
      },
      confidence: {
        type: Number,
        required: true,
        min: 0,
        max: 1
      },
      boundingBox: {
        x: { type: Number, required: true },
        y: { type: Number, required: true },
        width: { type: Number, required: true },
        height: { type: Number, required: true }
      }
    }],
    processingDetails: {
      facesDetected: {
        type: Number,
        required: true,
        min: 0
      },
      processingTime: {
        type: Number,
        required: true
      },
      algorithm: {
        type: String,
        required: true,
        default: 'face_recognition'
      },
      status: {
        type: String,
        enum: ['processed', 'failed', 'pending'],
        required: true,
        default: 'pending'
      },
      error: {
        type: String
      }
    },
    metadata: {
      imageSize: {
        type: Number,
        required: true
      },
      imageDimensions: {
        width: { type: Number, required: true },
        height: { type: Number, required: true }
      },
      mimeType: {
        type: String,
        required: true
      }
    },
    isNotified: {
      type: Boolean,
      default: false,
      index: true
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true
    },
    tags: [{
      type: String,
      trim: true
    }]
  },
  {
    timestamps: true,
    index: [
      { userId: 1, createdAt: -1 },
      { groupId: 1, createdAt: -1 },
      { 'detectedPersons.personId': 1, createdAt: -1 },
      { isArchived: 1, userId: 1, createdAt: -1 }
    ]
  }
);

// Text search index for captions and tags
FilteredImageSchema.index({ 
  originalCaption: 'text', 
  tags: 'text',
  senderName: 'text',
  groupName: 'text'
});

// Static method to get images for user
FilteredImageSchema.statics.getImagesForUser = function(
  userId: string, 
  options: { 
    personId?: string;
    groupId?: string;
    archived?: boolean;
    limit?: number;
    skip?: number;
  } = {}
) {
  const query: any = { userId };
  
  if (options.personId) {
    query['detectedPersons.personId'] = options.personId;
  }
  
  if (options.groupId) {
    query.groupId = options.groupId;
  }
  
  if (options.archived !== undefined) {
    query.isArchived = options.archived;
  }
  
  return this.find(query)
    .populate('detectedPersons.personId', 'name')
    .sort({ createdAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

// Method to mark as notified
FilteredImageSchema.methods.markAsNotified = function(this: IFilteredImage) {
  this.isNotified = true;
  return this.save();
};

// Method to archive image
FilteredImageSchema.methods.archive = function(this: IFilteredImage) {
  this.isArchived = true;
  return this.save();
};

// Method to add tag
FilteredImageSchema.methods.addTag = function(this: IFilteredImage, tag: string) {
  if (!this.tags.includes(tag)) {
    this.tags.push(tag);
    return this.save();
  }
  return Promise.resolve(this);
};

const FilteredImage = mongoose.model<IFilteredImage>('FilteredImage', FilteredImageSchema);

export default FilteredImage;