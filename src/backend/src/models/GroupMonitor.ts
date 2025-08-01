import mongoose, { Schema, Document } from 'mongoose';

export interface IGroupMonitor extends Document {
  groupId: string;
  groupName: string;
  userId: mongoose.Types.ObjectId;
  targetPersons: mongoose.Types.ObjectId[];
  isActive: boolean;
  settings: {
    notifyOnMatch: boolean;
    saveAllImages: boolean;
    confidenceThreshold: number;
    autoReply: boolean;
    replyMessage?: string;
  };
  statistics: {
    totalMessages: number;
    imagesProcessed: number;
    personsDetected: number;
    lastActivity?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  incrementStats(type: 'messages' | 'images' | 'persons'): Promise<IGroupMonitor>;
  toggleActive(): Promise<IGroupMonitor>;
}

const GroupMonitorSchema: Schema<IGroupMonitor> = new Schema(
  {
    groupId: {
      type: String,
      required: true,
      index: true
    },
    groupName: {
      type: String,
      required: true,
      trim: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    targetPersons: [{
      type: Schema.Types.ObjectId,
      ref: 'PersonProfile',
      required: true
    }],
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    settings: {
      notifyOnMatch: {
        type: Boolean,
        default: true
      },
      saveAllImages: {
        type: Boolean,
        default: false
      },
      confidenceThreshold: {
        type: Number,
        default: 0.7,
        min: 0.1,
        max: 1.0
      },
      autoReply: {
        type: Boolean,
        default: false
      },
      replyMessage: {
        type: String,
        maxlength: 1000
      }
    },
    statistics: {
      totalMessages: {
        type: Number,
        default: 0
      },
      imagesProcessed: {
        type: Number,
        default: 0
      },
      personsDetected: {
        type: Number,
        default: 0
      },
      lastActivity: {
        type: Date
      }
    }
  },
  {
    timestamps: true,
    index: [
      { userId: 1, isActive: 1 },
      { groupId: 1, userId: 1 }
    ]
  }
);

// Ensure unique monitoring per group per user
GroupMonitorSchema.index({ groupId: 1, userId: 1 }, { unique: true });

// Static method to get active monitors for user
GroupMonitorSchema.statics.getActiveMonitors = function(userId: string) {
  return this.find({
    userId: userId,
    isActive: true
  })
  .populate('targetPersons', 'name description')
  .sort({ updatedAt: -1 });
};

// Static method to find monitor by group
GroupMonitorSchema.statics.findByGroup = function(groupId: string) {
  return this.find({
    groupId: groupId,
    isActive: true
  }).populate('targetPersons', 'name faceEmbeddings');
};

// Method to increment statistics
GroupMonitorSchema.methods.incrementStats = function(this: IGroupMonitor, type: 'messages' | 'images' | 'persons') {
  switch (type) {
    case 'messages':
      this.statistics.totalMessages += 1;
      break;
    case 'images':
      this.statistics.imagesProcessed += 1;
      break;
    case 'persons':
      this.statistics.personsDetected += 1;
      break;
  }
  this.statistics.lastActivity = new Date();
  return this.save();
};

// Method to toggle monitoring
GroupMonitorSchema.methods.toggleActive = function(this: IGroupMonitor) {
  this.isActive = !this.isActive;
  return this.save();
};

const GroupMonitor = mongoose.model<IGroupMonitor>('GroupMonitor', GroupMonitorSchema);

export default GroupMonitor;