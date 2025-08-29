"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const personProfileService_1 = __importDefault(require("../../services/personProfileService"));
const groupMonitorService_1 = __importDefault(require("../../services/groupMonitorService"));
const FilteredImage_1 = __importDefault(require("../../models/FilteredImage"));
class GroupMonitorController {
    constructor() {
        this.personProfileService = new personProfileService_1.default();
        this.groupMonitorService = new groupMonitorService_1.default();
    }
    // Person Profile endpoints
    async createPersonProfile(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
                return;
            }
            const { name, description, trainingImages } = req.body;
            if (!name || !name.trim()) {
                res.status(400).json({
                    success: false,
                    error: 'Person name is required'
                });
                return;
            }
            if (!trainingImages || !Array.isArray(trainingImages) || trainingImages.length === 0) {
                res.status(400).json({
                    success: false,
                    error: 'At least one training image is required'
                });
                return;
            }
            const personProfile = await this.personProfileService.createPersonProfile(userId, {
                name: name.trim(),
                description: description?.trim(),
                trainingImages
            });
            res.status(201).json({
                success: true,
                data: personProfile,
                message: 'Person profile created successfully'
            });
        }
        catch (error) {
            console.error('Error creating person profile:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to create person profile'
            });
        }
    }
    async getPersonProfiles(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
                return;
            }
            const profiles = await this.personProfileService.getPersonProfilesByUser(userId);
            res.json({
                success: true,
                data: profiles
            });
        }
        catch (error) {
            console.error('Error fetching person profiles:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch person profiles'
            });
        }
    }
    async getPersonProfile(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
                return;
            }
            const { id } = req.params;
            const profile = await this.personProfileService.getPersonProfileById(id, userId);
            if (!profile) {
                res.status(404).json({
                    success: false,
                    error: 'Person profile not found'
                });
                return;
            }
            res.json({
                success: true,
                data: profile
            });
        }
        catch (error) {
            console.error('Error fetching person profile:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch person profile'
            });
        }
    }
    async updatePersonProfile(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
                return;
            }
            const { id } = req.params;
            const updates = req.body;
            const updatedProfile = await this.personProfileService.updatePersonProfile(id, userId, updates);
            if (!updatedProfile) {
                res.status(404).json({
                    success: false,
                    error: 'Person profile not found'
                });
                return;
            }
            res.json({
                success: true,
                data: updatedProfile,
                message: 'Person profile updated successfully'
            });
        }
        catch (error) {
            console.error('Error updating person profile:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to update person profile'
            });
        }
    }
    async deletePersonProfile(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
                return;
            }
            const { id } = req.params;
            const deleted = await this.personProfileService.deletePersonProfile(id, userId);
            if (!deleted) {
                res.status(404).json({
                    success: false,
                    error: 'Person profile not found'
                });
                return;
            }
            res.json({
                success: true,
                message: 'Person profile deleted successfully'
            });
        }
        catch (error) {
            console.error('Error deleting person profile:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to delete person profile'
            });
        }
    }
    async addTrainingImages(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
                return;
            }
            const { id } = req.params;
            const { trainingImages } = req.body;
            if (!trainingImages || !Array.isArray(trainingImages) || trainingImages.length === 0) {
                res.status(400).json({
                    success: false,
                    error: 'Training images are required'
                });
                return;
            }
            const updatedProfile = await this.personProfileService.addTrainingImages(id, userId, trainingImages);
            if (!updatedProfile) {
                res.status(404).json({
                    success: false,
                    error: 'Person profile not found'
                });
                return;
            }
            res.json({
                success: true,
                data: updatedProfile,
                message: 'Training images added successfully'
            });
        }
        catch (error) {
            console.error('Error adding training images:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to add training images'
            });
        }
    }
    // Group Monitor endpoints
    async createGroupMonitor(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
                return;
            }
            const { groupId, groupName, targetPersons, settings } = req.body;
            if (!groupId || !groupName) {
                res.status(400).json({
                    success: false,
                    error: 'Group ID and name are required'
                });
                return;
            }
            if (!targetPersons || !Array.isArray(targetPersons) || targetPersons.length === 0) {
                res.status(400).json({
                    success: false,
                    error: 'At least one target person is required'
                });
                return;
            }
            const monitor = await this.groupMonitorService.createGroupMonitor(userId, {
                groupId,
                groupName,
                targetPersons,
                settings
            });
            res.status(201).json({
                success: true,
                data: monitor,
                message: 'Group monitor created successfully'
            });
        }
        catch (error) {
            console.error('Error creating group monitor:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to create group monitor'
            });
        }
    }
    async getGroupMonitors(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
                return;
            }
            const monitors = await this.groupMonitorService.getGroupMonitorsByUser(userId);
            res.json({
                success: true,
                data: monitors
            });
        }
        catch (error) {
            console.error('Error fetching group monitors:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch group monitors'
            });
        }
    }
    async updateGroupMonitor(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
                return;
            }
            const { id } = req.params;
            const updates = req.body;
            const updatedMonitor = await this.groupMonitorService.updateGroupMonitor(id, userId, updates);
            if (!updatedMonitor) {
                res.status(404).json({
                    success: false,
                    error: 'Group monitor not found'
                });
                return;
            }
            res.json({
                success: true,
                data: updatedMonitor,
                message: 'Group monitor updated successfully'
            });
        }
        catch (error) {
            console.error('Error updating group monitor:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to update group monitor'
            });
        }
    }
    async deleteGroupMonitor(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
                return;
            }
            const { id } = req.params;
            const deleted = await this.groupMonitorService.deleteGroupMonitor(id, userId);
            if (!deleted) {
                res.status(404).json({
                    success: false,
                    error: 'Group monitor not found'
                });
                return;
            }
            res.json({
                success: true,
                message: 'Group monitor deleted successfully'
            });
        }
        catch (error) {
            console.error('Error deleting group monitor:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to delete group monitor'
            });
        }
    }
    async getMonitorStatistics(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
                return;
            }
            const { id } = req.params;
            const statistics = await this.groupMonitorService.getMonitorStatistics(id, userId);
            res.json({
                success: true,
                data: statistics
            });
        }
        catch (error) {
            console.error('Error fetching monitor statistics:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch monitor statistics'
            });
        }
    }
    // Filtered Images endpoints
    async getFilteredImages(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
                return;
            }
            const { personId, groupId, archived, limit, skip } = req.query;
            const options = {
                limit: limit ? parseInt(limit) : 50,
                skip: skip ? parseInt(skip) : 0
            };
            if (personId)
                options.personId = personId;
            if (groupId)
                options.groupId = groupId;
            if (archived !== undefined)
                options.archived = archived === 'true';
            const images = await this.groupMonitorService.getFilteredImages(userId, options);
            res.json({
                success: true,
                data: images
            });
        }
        catch (error) {
            console.error('Error fetching filtered images:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch filtered images'
            });
        }
    }
    async archiveFilteredImage(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
                return;
            }
            const { id } = req.params;
            const image = await FilteredImage_1.default.findOne({
                _id: id,
                userId: userId
            });
            if (!image) {
                res.status(404).json({
                    success: false,
                    error: 'Filtered image not found'
                });
                return;
            }
            await image.archive();
            res.json({
                success: true,
                message: 'Image archived successfully'
            });
        }
        catch (error) {
            console.error('Error archiving filtered image:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to archive image'
            });
        }
    }
    async addImageTag(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
                return;
            }
            const { id } = req.params;
            const { tag } = req.body;
            if (!tag || !tag.trim()) {
                res.status(400).json({
                    success: false,
                    error: 'Tag is required'
                });
                return;
            }
            const image = await FilteredImage_1.default.findOne({
                _id: id,
                userId: userId
            });
            if (!image) {
                res.status(404).json({
                    success: false,
                    error: 'Filtered image not found'
                });
                return;
            }
            await image.addTag(tag.trim());
            res.json({
                success: true,
                message: 'Tag added successfully'
            });
        }
        catch (error) {
            console.error('Error adding image tag:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to add tag'
            });
        }
    }
    // Health check and service status
    async getServiceStatus(req, res) {
        try {
            const faceRecognitionHealthy = await this.personProfileService.testFaceRecognitionService();
            res.json({
                success: true,
                data: {
                    faceRecognitionService: faceRecognitionHealthy ? 'healthy' : 'unhealthy',
                    timestamp: new Date().toISOString()
                }
            });
        }
        catch (error) {
            console.error('Error checking service status:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to check service status'
            });
        }
    }
    // Webhook for processing WhatsApp messages
    async processWhatsAppMessage(req, res) {
        try {
            const { messageId, groupId, senderId, senderName, imageUrl, caption } = req.body;
            if (!messageId || !groupId || !senderId || !imageUrl) {
                res.status(400).json({
                    success: false,
                    error: 'Missing required message data'
                });
                return;
            }
            // Process the image in the background
            this.groupMonitorService.processImageMessage(messageId, groupId, senderId, senderName || 'Unknown', imageUrl, caption).catch(error => {
                console.error('Background image processing failed:', error);
            });
            res.json({
                success: true,
                message: 'Message processing initiated'
            });
        }
        catch (error) {
            console.error('Error processing WhatsApp message:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to process message'
            });
        }
    }
}
exports.default = GroupMonitorController;
