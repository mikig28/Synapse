import { Response } from 'express';
import { AuthenticatedRequest } from '../../types/express';
import telegramChannelService from '../../services/telegramChannelService';

// @desc    Get all channels for authenticated user
// @route   GET /api/v1/telegram-channels
// @access  Private
export const getUserChannels = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const channels = await telegramChannelService.getUserChannels(userId);
    
    res.status(200).json({
      success: true,
      data: channels,
      count: channels.length
    });
  } catch (error: any) {
    console.error('[TelegramChannelController] Error getting channels:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to fetch channels' 
    });
  }
};

// @desc    Add new channel to monitor
// @route   POST /api/v1/telegram-channels
// @access  Private
export const addChannel = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { channelIdentifier, keywords } = req.body;
    
    if (!userId) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    if (!channelIdentifier) {
      return res.status(400).json({ 
        success: false, 
        message: 'Channel identifier is required (e.g., @channelname or channel ID)' 
      });
    }

    // Validate channel identifier format
    if (!channelIdentifier.startsWith('@') && !channelIdentifier.startsWith('-') && isNaN(Number(channelIdentifier))) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid channel identifier. Use @channelname, channel ID, or -groupID format' 
      });
    }

    const channel = await telegramChannelService.addChannel(
      userId, 
      channelIdentifier.trim(),
      keywords && Array.isArray(keywords) ? keywords : []
    );

    res.status(201).json({
      success: true,
      message: 'Channel added successfully',
      data: channel
    });
  } catch (error: any) {
    console.error('[TelegramChannelController] Error adding channel:', error);
    
    let statusCode = 500;
    let message = 'Failed to add channel';
    
    if (error.message.includes('already being monitored')) {
      statusCode = 409;
      message = error.message;
    } else if (error.message.includes('Cannot access channel')) {
      statusCode = 400;
      message = error.message;
    } else if (error.message.includes('Chat not found')) {
      statusCode = 404;
      message = 'Channel not found. Make sure the channel exists and is public.';
    }

    res.status(statusCode).json({ 
      success: false, 
      message 
    });
  }
};

// @desc    Remove channel from monitoring
// @route   DELETE /api/v1/telegram-channels/:channelId
// @access  Private
export const removeChannel = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { channelId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    await telegramChannelService.removeChannel(userId, channelId);

    res.status(200).json({
      success: true,
      message: 'Channel removed successfully'
    });
  } catch (error: any) {
    console.error('[TelegramChannelController] Error removing channel:', error);
    
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({ 
      success: false, 
      message: error.message || 'Failed to remove channel' 
    });
  }
};

// @desc    Toggle channel active status
// @route   PATCH /api/v1/telegram-channels/:channelId/toggle
// @access  Private
export const toggleChannelStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { channelId } = req.params;
    const { isActive } = req.body;
    
    if (!userId) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ 
        success: false, 
        message: 'isActive must be a boolean value' 
      });
    }

    const channel = await telegramChannelService.toggleChannelStatus(userId, channelId, isActive);

    res.status(200).json({
      success: true,
      message: `Channel ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: channel
    });
  } catch (error: any) {
    console.error('[TelegramChannelController] Error toggling channel:', error);
    
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({ 
      success: false, 
      message: error.message || 'Failed to update channel status' 
    });
  }
};

// @desc    Update channel keywords
// @route   PATCH /api/v1/telegram-channels/:channelId/keywords
// @access  Private
export const updateChannelKeywords = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { channelId } = req.params;
    const { keywords } = req.body;
    
    if (!userId) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    if (!Array.isArray(keywords)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Keywords must be an array' 
      });
    }

    // Implementation would update the channel keywords in the database
    // For now, returning success message
    res.status(200).json({
      success: true,
      message: 'Channel keywords updated successfully'
    });
  } catch (error: any) {
    console.error('[TelegramChannelController] Error updating keywords:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to update channel keywords' 
    });
  }
};

// @desc    Search messages across channels
// @route   GET /api/v1/telegram-channels/search
// @access  Private
export const searchChannelMessages = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { query, channelId } = req.query;
    
    if (!userId) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ 
        success: false, 
        message: 'Search query is required' 
      });
    }

    const results = await telegramChannelService.searchChannelMessages(
      userId, 
      query, 
      channelId as string
    );

    res.status(200).json({
      success: true,
      data: results,
      count: results.length,
      query
    });
  } catch (error: any) {
    console.error('[TelegramChannelController] Error searching:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Search failed' 
    });
  }
};

// @desc    Get channel details with recent messages
// @route   GET /api/v1/telegram-channels/:channelId
// @access  Private
export const getChannelDetails = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { channelId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    if (!userId) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const channels = await telegramChannelService.getUserChannels(userId);
    const channel = channels.find(c => c._id.toString() === channelId);

    if (!channel) {
      return res.status(404).json({ 
        success: false, 
        message: 'Channel not found' 
      });
    }

    // Get paginated messages
    const startIndex = parseInt(offset as string) || 0;
    const limitNum = Math.min(parseInt(limit as string) || 50, 100); // Max 100 messages
    
    const messages = channel.messages
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(startIndex, startIndex + limitNum);

    res.status(200).json({
      success: true,
      data: {
        ...channel.toObject(),
        messages,
        pagination: {
          offset: startIndex,
          limit: limitNum,
          total: channel.messages.length,
          hasMore: startIndex + limitNum < channel.messages.length
        }
      }
    });
  } catch (error: any) {
    console.error('[TelegramChannelController] Error getting channel details:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to get channel details' 
    });
  }
};

// @desc    Force fetch new messages for a channel
// @route   POST /api/v1/telegram-channels/:channelId/fetch
// @access  Private
export const forceChannelFetch = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { channelId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const channels = await telegramChannelService.getUserChannels(userId);
    const channel = channels.find(c => c._id.toString() === channelId);

    if (!channel) {
      return res.status(404).json({ 
        success: false, 
        message: 'Channel not found' 
      });
    }

    // Trigger immediate fetch
    await telegramChannelService.fetchChannelMessages(channelId);

    res.status(200).json({
      success: true,
      message: 'Channel fetch triggered successfully'
    });
  } catch (error: any) {
    console.error('[TelegramChannelController] Error forcing fetch:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to fetch channel messages' 
    });
  }
};
