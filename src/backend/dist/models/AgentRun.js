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
const AgentRunSchema = new mongoose_1.Schema({
    agentId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Agent', required: true },
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
        type: String,
        enum: ['running', 'completed', 'failed', 'cancelled'],
        required: true,
        default: 'running',
    },
    startTime: { type: Date, required: true, default: Date.now },
    endTime: { type: Date },
    duration: { type: Number }, // in milliseconds
    itemsProcessed: { type: Number, default: 0 },
    itemsAdded: { type: Number, default: 0 },
    errorMessages: { type: [String], default: [] },
    logs: [
        {
            timestamp: { type: Date, default: Date.now },
            level: {
                type: String,
                enum: ['info', 'warn', 'error'],
                required: true,
            },
            message: { type: String, required: true },
            data: { type: mongoose_1.Schema.Types.Mixed },
        },
    ],
    results: {
        summary: { type: String, default: '' },
        details: { type: mongoose_1.Schema.Types.Mixed },
        sessionId: { type: String },
    },
}, { timestamps: true });
// Index for efficient querying
AgentRunSchema.index({ agentId: 1, createdAt: -1 });
AgentRunSchema.index({ userId: 1, createdAt: -1 });
AgentRunSchema.index({ status: 1, createdAt: -1 });
// Method to add log entry
AgentRunSchema.methods.addLog = function (level, message, data) {
    this.logs.push({
        timestamp: new Date(),
        level,
        message,
        data,
    });
    return this.save();
};
// Method to complete the run
AgentRunSchema.methods.complete = function (summary, details) {
    this.status = 'completed';
    this.endTime = new Date();
    this.duration = this.endTime.getTime() - this.startTime.getTime();
    this.results = { summary, details };
    return this.save();
};
// Method to fail the run
AgentRunSchema.methods.fail = function (error) {
    this.status = 'failed';
    this.endTime = new Date();
    this.duration = this.endTime.getTime() - this.startTime.getTime();
    this.errorMessages.push(error);
    return this.save();
};
const AgentRun = mongoose_1.default.model('AgentRun', AgentRunSchema);
exports.default = AgentRun;
