import { Request, Response } from 'express';
import Feedback, { IFeedback } from '../../models/Feedback';
import User from '../../models/User';
import emailService from '../../services/emailService';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

interface FeedbackRequest {
  type: 'bug' | 'feature' | 'improvement' | 'general' | 'rating';
  category: 'ui' | 'performance' | 'functionality' | 'content' | 'mobile' | 'other';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  rating?: number;
  title: string;
  description: string;
  steps?: string;
  expectedBehavior?: string;
  actualBehavior?: string;
  email?: string; // For anonymous feedback
  browserInfo?: {
    userAgent: string;
    platform: string;
    language: string;
    viewport: {
      width: number;
      height: number;
    };
  };
  context?: {
    page: string;
    url: string;
    feature: string;
    sessionId?: string;
  };
  tags?: string[];
}

/**
 * Create new feedback
 */
export const createFeedback = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      type,
      category,
      priority = 'medium',
      rating,
      title,
      description,
      steps,
      expectedBehavior,
      actualBehavior,
      email,
      browserInfo,
      context,
      tags = []
    }: FeedbackRequest = req.body;

    // Validation
    if (!type || !category || !title || !description) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type, category, title, description'
      });
    }

    if (type === 'rating' && (!rating || rating < 1 || rating > 5)) {
      return res.status(400).json({
        success: false,
        error: 'Rating must be between 1 and 5 for rating feedback'
      });
    }

    // For anonymous feedback, require email
    if (!req.user?.id && !email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required for anonymous feedback'
      });
    }

    // Auto-determine priority for bugs
    let finalPriority = priority;
    if (type === 'bug' && !priority) {
      // Simple heuristic: if description contains critical keywords, mark as high priority
      const criticalKeywords = ['crash', 'broken', 'error', 'fail', 'cannot', 'unable', 'lost data'];
      const hasCriticalKeyword = criticalKeywords.some(keyword => 
        description.toLowerCase().includes(keyword) || title.toLowerCase().includes(keyword)
      );
      finalPriority = hasCriticalKeyword ? 'high' : 'medium';
    }

    const feedbackData = {
      userId: req.user?.id,
      email: email || req.user?.email,
      type,
      category,
      priority: finalPriority,
      rating,
      title: title.trim(),
      description: description.trim(),
      steps: steps?.trim(),
      expectedBehavior: expectedBehavior?.trim(),
      actualBehavior: actualBehavior?.trim(),
      browserInfo,
      context,
      tags: tags.map(tag => tag.toLowerCase().trim()),
      votes: {
        upvotes: 0,
        downvotes: 0,
        userVotes: new Map()
      }
    };

    const feedback = new Feedback(feedbackData);
    await feedback.save();

    // Populate user info if available
    await feedback.populate('userId', 'name email');

    // Send email notification to developer
    try {
      const userEmail = email || req.user?.email || 'anonymous@synapse.ai';
      const userName = req.user ?
        await User.findById(req.user.id).then(u => u?.fullName || 'Anonymous User') :
        'Anonymous User';

      await emailService.sendFeedbackEmail(
        userEmail,
        userName,
        type,
        `${title}\n\n${description}${steps ? `\n\nSteps:\n${steps}` : ''}${expectedBehavior ? `\n\nExpected: ${expectedBehavior}` : ''}${actualBehavior ? `\n\nActual: ${actualBehavior}` : ''}`,
        rating
      );
      console.log('[FeedbackController] Email notification sent to developer');
    } catch (emailError) {
      console.error('[FeedbackController] Failed to send email notification:', emailError);
      // Don't fail the request if email fails
    }

    res.status(201).json({
      success: true,
      data: feedback,
      message: 'Feedback submitted successfully'
    });

    // TODO: Auto-create GitHub issue for bugs/features if configured

  } catch (error) {
    console.error('Error creating feedback:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit feedback'
    });
  }
};

/**
 * Get feedback list with filtering and pagination
 */
export const getFeedback = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      page = 1,
      limit = 10,
      type,
      category,
      status,
      priority,
      userId,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      tags
    } = req.query;

    // Build filter query
    const filter: any = {};

    if (type) filter.type = type;
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (userId) filter.userId = userId;
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      filter.tags = { $in: tagArray };
    }

    // Text search
    if (search) {
      filter.$text = { $search: search as string };
    }

    // Pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Sort options
    const sortOptions: any = {};
    if (search) {
      sortOptions.score = { $meta: 'textScore' };
    }
    sortOptions[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const feedback = await Feedback.find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .populate('userId', 'name email')
      .populate('resolvedBy', 'name email');

    const total = await Feedback.countDocuments(filter);

    res.json({
      success: true,
      data: {
        feedback,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });

  } catch (error) {
    console.error('Error getting feedback:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get feedback'
    });
  }
};

/**
 * Get single feedback by ID
 */
export const getFeedbackById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const feedback = await Feedback.findById(id)
      .populate('userId', 'name email')
      .populate('resolvedBy', 'name email');

    if (!feedback) {
      return res.status(404).json({
        success: false,
        error: 'Feedback not found'
      });
    }

    res.json({
      success: true,
      data: feedback
    });

  } catch (error) {
    console.error('Error getting feedback by ID:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get feedback'
    });
  }
};

/**
 * Vote on feedback (upvote/downvote)
 */
export const voteFeedback = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { vote } = req.body; // 'up', 'down', or null to remove vote

    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required to vote'
      });
    }

    if (vote && !['up', 'down'].includes(vote)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid vote. Use "up" or "down"'
      });
    }

    const feedback = await Feedback.findById(id);
    if (!feedback) {
      return res.status(404).json({
        success: false,
        error: 'Feedback not found'
      });
    }

    const userId = req.user.id;
    const currentVote = feedback.votes.userVotes.get(userId);

    // Remove previous vote counts
    if (currentVote === 'up') {
      feedback.votes.upvotes = Math.max(0, feedback.votes.upvotes - 1);
    } else if (currentVote === 'down') {
      feedback.votes.downvotes = Math.max(0, feedback.votes.downvotes - 1);
    }

    // Apply new vote
    if (vote === 'up') {
      feedback.votes.upvotes++;
      feedback.votes.userVotes.set(userId, 'up');
    } else if (vote === 'down') {
      feedback.votes.downvotes++;
      feedback.votes.userVotes.set(userId, 'down');
    } else {
      // Remove vote
      feedback.votes.userVotes.delete(userId);
    }

    await feedback.save();

    res.json({
      success: true,
      data: {
        id: feedback._id,
        upvotes: feedback.votes.upvotes,
        downvotes: feedback.votes.downvotes,
        userVote: feedback.votes.userVotes.get(userId) || null
      }
    });

  } catch (error) {
    console.error('Error voting on feedback:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to vote on feedback'
    });
  }
};

/**
 * Update feedback status (admin only)
 */
export const updateFeedbackStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    // TODO: Add admin role check
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const validStatuses = ['open', 'in_progress', 'resolved', 'closed', 'duplicate'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status'
      });
    }

    const updateData: any = { status };
    
    if (adminNotes) {
      updateData.adminNotes = adminNotes;
    }

    if (status === 'resolved' || status === 'closed') {
      updateData.resolvedAt = new Date();
      updateData.resolvedBy = req.user.id;
    }

    const feedback = await Feedback.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('userId', 'name email')
     .populate('resolvedBy', 'name email');

    if (!feedback) {
      return res.status(404).json({
        success: false,
        error: 'Feedback not found'
      });
    }

    res.json({
      success: true,
      data: feedback,
      message: 'Feedback status updated successfully'
    });

  } catch (error) {
    console.error('Error updating feedback status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update feedback status'
    });
  }
};

/**
 * Get feedback statistics
 */
export const getFeedbackStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const stats = await Feedback.getFeedbackStats();
    const topIssues = await Feedback.getTopIssues(5);

    // Recent feedback trends (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentTrends = await Feedback.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            type: '$type'
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.date': 1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        overview: stats[0] || {
          total: 0,
          averageRating: 0,
          openCount: 0,
          resolvedCount: 0
        },
        topIssues,
        trends: recentTrends
      }
    });

  } catch (error) {
    console.error('Error getting feedback stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get feedback statistics'
    });
  }
};

/**
 * Get user's own feedback
 */
export const getUserFeedback = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const {
      page = 1,
      limit = 10,
      status,
      type
    } = req.query;

    const filter: any = { userId: req.user.id };
    if (status) filter.status = status;
    if (type) filter.type = type;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const feedback = await Feedback.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Feedback.countDocuments(filter);

    res.json({
      success: true,
      data: {
        feedback,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });

  } catch (error) {
    console.error('Error getting user feedback:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user feedback'
    });
  }
};