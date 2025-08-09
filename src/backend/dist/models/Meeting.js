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
const mongoose_1 = __importStar(require("mongoose"));
const MeetingSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    audioFilePath: { type: String },
    audioFileName: { type: String },
    audioFileSize: { type: Number },
    duration: { type: Number },
    transcription: { type: String },
    summary: { type: String },
    keyHighlights: [{ type: String }],
    extractedTasks: [{
            title: { type: String, required: true },
            description: { type: String },
            priority: {
                type: String,
                enum: ['low', 'medium', 'high'],
                default: 'medium'
            },
            taskId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Task' }
        }],
    extractedNotes: [{
            content: { type: String, required: true },
            noteId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Note' }
        }],
    transcriptionMethod: {
        type: String,
        enum: ['local', 'api', 'dedicated'],
        default: 'api'
    },
    status: {
        type: String,
        enum: ['recording', 'processing', 'completed', 'failed'],
        default: 'processing'
    },
    processingProgress: { type: Number, default: 0, min: 0, max: 100 },
    errorMessage: { type: String },
    meetingDate: { type: Date, required: true }
}, { timestamps: true });
MeetingSchema.index({ userId: 1, meetingDate: -1 });
MeetingSchema.index({ userId: 1, status: 1 });
MeetingSchema.index({ userId: 1, createdAt: -1 });
const Meeting = mongoose_1.default.model('Meeting', MeetingSchema);
exports.default = Meeting;
