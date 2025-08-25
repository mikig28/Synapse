"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const GroupMonitor_1 = __importDefault(require("../models/GroupMonitor"));
const FilteredImage_1 = __importDefault(require("../models/FilteredImage"));
const PersonProfile_1 = __importDefault(require("../models/PersonProfile"));
const wahaService_1 = __importDefault(require("./wahaService"));
const axios_1 = __importDefault(require("axios"));
const mongoose_1 = require("mongoose");
class GroupMonitorService {
    constructor() {
        this.wahaService = wahaService_1.default.getInstance();
        this.faceRecognitionUrl = process.env.FACE_RECOGNITION_SERVICE_URL || 'http://localhost:5001';
    }
    /**
     * Create a new group monitor
     */
    async createGroupMonitor(userId, monitorData) {
        try {
            // Validate target persons belong to user
            const targetPersons = await PersonProfile_1.default.find({
                _id: { $in: monitorData.targetPersons.map(id => new mongoose_1.Types.ObjectId(id)) },
                userId: new mongoose_1.Types.ObjectId(userId),
                isActive: true
            });
            if (targetPersons.length !== monitorData.targetPersons.length) {
                throw new Error('Some target persons not found or do not belong to user');
            }
            // Check if monitor already exists for this group and user
            const existingMonitor = await GroupMonitor_1.default.findOne({
                groupId: monitorData.groupId,
                userId: new mongoose_1.Types.ObjectId(userId)
            });
            if (existingMonitor) {
                throw new Error('Group monitor already exists for this group');
            }
            const defaultSettings = {
                notifyOnMatch: true,
                saveAllImages: false,
                confidenceThreshold: 0.7,
                autoReply: false,
                ...monitorData.settings
            };
            const groupMonitor = new GroupMonitor_1.default({
                groupId: monitorData.groupId,
                groupName: monitorData.groupName,
                userId: new mongoose_1.Types.ObjectId(userId),
                targetPersons: targetPersons.map(p => p._id),
                settings: defaultSettings,
                isActive: true,
                statistics: {
                    totalMessages: 0,
                    imagesProcessed: 0,
                    personsDetected: 0
                }
            });
            return await groupMonitor.save();
        }
        catch (error) {
            console.error('Error creating group monitor:', error);
            throw new Error(`Failed to create group monitor: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get all group monitors for a user
     */
    async getGroupMonitorsByUser(userId) {
        try {
            return await GroupMonitor_1.default.find({
                userId: new mongoose_1.Types.ObjectId(userId)
            })
                .populate('targetPersons', 'name description')
                .sort({ updatedAt: -1 });
        }
        catch (error) {
            console.error('Error fetching group monitors:', error);
            throw new Error('Failed to fetch group monitors');
        }
    }
    /**
     * Get active group monitors for a specific group
     */
    async getActiveMonitorsForGroup(groupId) {
        try {
            return await GroupMonitor_1.default.find({
                groupId: groupId,
                isActive: true
            }).populate('targetPersons', 'name faceEmbeddings');
        }
        catch (error) {
            console.error('Error fetching active monitors for group:', error);
            throw new Error('Failed to fetch active monitors');
        }
    }
    /**
     * Update group monitor settings
     */
    async updateGroupMonitor(monitorId, userId, updates) {
        try {
            const monitor = await GroupMonitor_1.default.findOne({
                _id: new mongoose_1.Types.ObjectId(monitorId),
                userId: new mongoose_1.Types.ObjectId(userId)
            });
            if (!monitor) {
                throw new Error('Group monitor not found');
            }
            // Update target persons if provided
            if (updates.targetPersons) {
                const targetPersons = await PersonProfile_1.default.find({
                    _id: { $in: updates.targetPersons.map(id => new mongoose_1.Types.ObjectId(id)) },
                    userId: new mongoose_1.Types.ObjectId(userId),
                    isActive: true
                });
                if (targetPersons.length !== updates.targetPersons.length) {
                    throw new Error('Some target persons not found or do not belong to user');
                }
                monitor.targetPersons = targetPersons.map(p => p._id);
            }
            // Update settings if provided
            if (updates.settings) {
                monitor.settings = { ...monitor.settings, ...updates.settings };
            }
            // Update active status if provided
            if (updates.isActive !== undefined) {
                monitor.isActive = updates.isActive;
            }
            return await monitor.save();
        }
        catch (error) {
            console.error('Error updating group monitor:', error);
            throw new Error(`Failed to update group monitor: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Delete group monitor
     */
    async deleteGroupMonitor(monitorId, userId) {
        try {
            const result = await GroupMonitor_1.default.deleteOne({
                _id: new mongoose_1.Types.ObjectId(monitorId),
                userId: new mongoose_1.Types.ObjectId(userId)
            });
            return result.deletedCount > 0;
        }
        catch (error) {
            console.error('Error deleting group monitor:', error);
            throw new Error('Failed to delete group monitor');
        }
    }
    /**
     * Process WhatsApp image message for person detection
     */
    async processImageMessage(messageId, groupId, senderId, senderName, imageUrl, caption) {
        try {
            // Get active monitors for this group
            const monitors = await this.getActiveMonitorsForGroup(groupId);
            if (monitors.length === 0) {
                return; // No active monitors for this group
            }
            // Process image for each monitor
            for (const monitor of monitors) {
                try {
                    await this.processImageForMonitor(monitor, messageId, senderId, senderName, imageUrl, caption);
                }
                catch (error) {
                    console.error(`Error processing image for monitor ${monitor._id}:`, error);
                    // Continue with other monitors
                }
            }
        }
        catch (error) {
            console.error('Error processing image message:', error);
        }
    }
    /**
     * Process image for a specific monitor
     */
    async processImageForMonitor(monitor, messageId, senderId, senderName, imageUrl, caption) {
        const startTime = Date.now();
        try {
            // Get target person IDs for face matching
            const targetPersonIds = monitor.targetPersons.map(p => p.toString());
            // Call face recognition service
            const matchResult = await this.matchFacesInImage(imageUrl, targetPersonIds, monitor.settings.confidenceThreshold);
            // Update monitor statistics
            await monitor.incrementStats('images');
            if (!matchResult.success) {
                console.error('Face matching failed:', matchResult.error);
                return;
            }
            // Check if any target persons were detected
            const detectedPersons = this.extractDetectedPersons(matchResult, monitor);
            if (detectedPersons.length > 0) {
                // Update monitor statistics
                await monitor.incrementStats('persons');
                // Create filtered image record
                const filteredImage = await this.createFilteredImageRecord(messageId, monitor, senderId, senderName, imageUrl, caption, detectedPersons, matchResult, Date.now() - startTime);
                // Send notification if enabled
                if (monitor.settings.notifyOnMatch) {
                    this.sendMatchNotification(monitor, filteredImage, detectedPersons);
                }
                // Send auto-reply if enabled
                if (monitor.settings.autoReply && monitor.settings.replyMessage) {
                    this.sendAutoReply(monitor.groupId, monitor.settings.replyMessage);
                }
            }
            else if (monitor.settings.saveAllImages) {
                // Save image even without matches if saveAllImages is enabled
                await this.createFilteredImageRecord(messageId, monitor, senderId, senderName, imageUrl, caption, [], matchResult, Date.now() - startTime);
            }
        }
        catch (error) {
            console.error('Error processing image for monitor:', error);
        }
    }
    /**
     * Match faces in image using face recognition service
     */
    async matchFacesInImage(imageUrl, personIds, confidenceThreshold) {
        try {
            const response = await axios_1.default.post(`${this.faceRecognitionUrl}/api/face/match`, {
                image: imageUrl,
                personIds: personIds,
                confidenceThreshold: confidenceThreshold
            }, {
                timeout: 30000,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        }
        catch (error) {
            console.error('Face recognition service error:', error);
            return {
                success: false,
                processingTime: 0,
                facesDetected: 0,
                imageDimensions: { width: 0, height: 0 },
                matches: [],
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Extract detected persons from match results
     */
    extractDetectedPersons(matchResult, monitor) {
        const detectedPersons = [];
        for (const match of matchResult.matches) {
            for (const personMatch of match.matches) {
                if (personMatch.confidence >= monitor.settings.confidenceThreshold) {
                    detectedPersons.push({
                        personId: new mongoose_1.Types.ObjectId(personMatch.personId),
                        personName: personMatch.personName,
                        confidence: personMatch.confidence,
                        boundingBox: match.boundingBox
                    });
                }
            }
        }
        return detectedPersons;
    }
    /**
     * Create filtered image record
     */
    async createFilteredImageRecord(messageId, monitor, senderId, senderName, imageUrl, caption, detectedPersons, matchResult, processingTime) {
        const filteredImage = new FilteredImage_1.default({
            messageId,
            groupId: monitor.groupId,
            groupName: monitor.groupName,
            userId: monitor.userId,
            senderId,
            senderName,
            imageUrl,
            originalCaption: caption,
            detectedPersons,
            processingDetails: {
                facesDetected: matchResult.facesDetected,
                processingTime,
                algorithm: 'face_recognition',
                status: 'processed'
            },
            metadata: {
                imageSize: 0, // Would need to fetch image to get actual size
                imageDimensions: matchResult.imageDimensions,
                mimeType: 'image/jpeg' // Default, would need to detect actual type
            },
            isNotified: false,
            isArchived: false,
            tags: []
        });
        return await filteredImage.save();
    }
    /**
     * Send notification about person match
     */
    sendMatchNotification(monitor, filteredImage, detectedPersons) {
        // TODO: Implement notification system (WebSocket, push notification, etc.)
        const personNames = detectedPersons.map(p => p.personName).join(', ');
        console.log(`🔔 Person match notification: ${personNames} detected in ${monitor.groupName}`);
        // Mark as notified
        filteredImage.markAsNotified().catch((error) => {
            console.error('Error marking notification as sent:', error);
        });
    }
    /**
     * Send auto-reply to WhatsApp group
     */
    async sendAutoReply(groupId, replyMessage) {
        try {
            await this.wahaService.sendMessage(groupId, replyMessage);
            console.log(`📱 Auto-reply sent to group ${groupId}: ${replyMessage}`);
        }
        catch (error) {
            console.error('Error sending auto-reply:', error);
        }
    }
    /**
     * Get filtered images for user
     */
    async getFilteredImages(userId, options = {}) {
        try {
            return await FilteredImage_1.default.getImagesForUser(userId, options);
        }
        catch (error) {
            console.error('Error fetching filtered images:', error);
            throw new Error('Failed to fetch filtered images');
        }
    }
    /**
     * Get monitor statistics
     */
    async getMonitorStatistics(monitorId, userId) {
        try {
            const monitor = await GroupMonitor_1.default.findOne({
                _id: new mongoose_1.Types.ObjectId(monitorId),
                userId: new mongoose_1.Types.ObjectId(userId)
            });
            if (!monitor) {
                throw new Error('Monitor not found');
            }
            const filteredImageCount = await FilteredImage_1.default.countDocuments({
                groupId: monitor.groupId,
                userId: new mongoose_1.Types.ObjectId(userId)
            });
            return {
                ...monitor.statistics,
                filteredImages: filteredImageCount,
                monitorId: monitor._id,
                groupName: monitor.groupName,
                isActive: monitor.isActive
            };
        }
        catch (error) {
            console.error('Error fetching monitor statistics:', error);
            throw new Error('Failed to fetch monitor statistics');
        }
    }
}
exports.default = GroupMonitorService;
