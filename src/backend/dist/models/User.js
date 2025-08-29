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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const UserSchema = new mongoose_1.Schema({
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
        required: function () {
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
        default: [], // Default to an empty array
    },
    sendAgentReportsToTelegram: {
        type: Boolean,
        default: false, // Default to false
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
    // You can add more fields here as your application grows
    // e.g., profilePictureUrl: String,
    // lastLogin: Date,
}, { timestamps: true } // Automatically adds createdAt and updatedAt
);
// Pre-save hook to hash password
UserSchema.pre('save', async function (next) {
    // Only hash the password if it has been modified (or is new) and is present
    if (!this.isModified('password') || !this.password) {
        return next();
    }
    try {
        const salt = await bcryptjs_1.default.genSalt(10);
        this.password = await bcryptjs_1.default.hash(this.password, salt);
        next();
    }
    catch (err) {
        next(err);
    }
});
// Method to compare candidate password with the stored hashed password
UserSchema.methods.comparePassword = async function (candidatePassword) {
    if (!this.password) {
        return false; // Should not happen if password was required
    }
    return bcryptjs_1.default.compare(candidatePassword, this.password);
};
const User = mongoose_1.default.model('User', UserSchema);
exports.default = User;
