import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../../types/express';
import NewsItem, { INewsItem } from '../../models/NewsItem';

// Get all news items for the authenticated user with pagination
export const getNewsItems = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const category = req.query.category as string;
    const isRead = req.query.isRead as string;
    const isFavorite = req.query.isFavorite as string;
    const search = req.query.search as string;

    const skip = (page - 1) * limit;

    // Build filter object
    const filter: any = { userId: new mongoose.Types.ObjectId(userId) };

    if (category) {
      filter.category = category;
    }

    if (isRead !== undefined) {
      filter.isRead = isRead === 'true';
    }

    if (isFavorite !== undefined) {
      filter.isFavorite = isFavorite === 'true';
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { summary: { $regex: search, $options: 'i' } },
        { 'source.name': { $regex: search, $options: 'i' } },
      ];
    }

    // Get total count
    const totalItems = await NewsItem.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / limit);

    // Get news items
    const newsItems = await NewsItem.find(filter)
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('agentId', 'name type');

    res.json({
      success: true,
      data: newsItems,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error: any) {
    console.error('[NewsController] Error fetching news items:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch news items',
      message: error.message,
    });
  }
};

// Get a specific news item by ID
export const getNewsItemById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { newsId } = req.params;
    const userId = req.user!.id;

    const newsItem = await NewsItem.findOne({
      _id: newsId,
      userId: new mongoose.Types.ObjectId(userId),
    }).populate('agentId', 'name type');

    if (!newsItem) {
      res.status(404).json({
        success: false,
        error: 'News item not found',
      });
      return;
    }

    res.json({
      success: true,
      data: newsItem,
    });
  } catch (error: any) {
    console.error('[NewsController] Error fetching news item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch news item',
      message: error.message,
    });
  }
};

// Mark news item as read
export const markAsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { newsId } = req.params;
    const userId = req.user!.id;

    const newsItem = await NewsItem.findOne({
      _id: newsId,
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!newsItem) {
      res.status(404).json({
        success: false,
        error: 'News item not found',
      });
      return;
    }

    await newsItem.markAsRead();

    res.json({
      success: true,
      data: newsItem,
      message: 'News item marked as read',
    });
  } catch (error: any) {
    console.error('[NewsController] Error marking news item as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark news item as read',
      message: error.message,
    });
  }
};

// Toggle favorite status
export const toggleFavorite = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { newsId } = req.params;
    const userId = req.user!.id;

    const newsItem = await NewsItem.findOne({
      _id: newsId,
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!newsItem) {
      res.status(404).json({
        success: false,
        error: 'News item not found',
      });
      return;
    }

    await newsItem.toggleFavorite();

    res.json({
      success: true,
      data: newsItem,
      message: `News item ${newsItem.isFavorite ? 'added to' : 'removed from'} favorites`,
    });
  } catch (error: any) {
    console.error('[NewsController] Error toggling favorite:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle favorite',
      message: error.message,
    });
  }
};

// Delete a news item
export const deleteNewsItem = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { newsId } = req.params;
    const userId = req.user!.id;

    const result = await NewsItem.findOneAndDelete({
      _id: newsId,
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!result) {
      res.status(404).json({
        success: false,
        error: 'News item not found',
      });
      return;
    }

    res.json({
      success: true,
      message: 'News item deleted successfully',
    });
  } catch (error: any) {
    console.error('[NewsController] Error deleting news item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete news item',
      message: error.message,
    });
  }
};

// Archive/unarchive news item
export const archiveNewsItem = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { newsId } = req.params;
    const userId = req.user!.id;
    const { archive } = req.body; // true to archive, false to unarchive

    const newsItem = await NewsItem.findOne({
      _id: newsId,
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!newsItem) {
      res.status(404).json({
        success: false,
        error: 'News item not found',
      });
      return;
    }

    newsItem.status = archive ? 'archived' : 'pending';
    await newsItem.save();

    res.json({
      success: true,
      data: newsItem,
      message: `News item ${archive ? 'archived' : 'unarchived'} successfully`,
    });
  } catch (error: any) {
    console.error('[NewsController] Error archiving news item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to archive news item',
      message: error.message,
    });
  }
};

// Get news categories for the user
export const getNewsCategories = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const categories = await NewsItem.distinct('category', {
      userId: new mongoose.Types.ObjectId(userId),
      category: { $ne: null },
    });

    res.json({
      success: true,
      data: categories.filter(cat => cat), // Remove null/undefined values
    });
  } catch (error: any) {
    console.error('[NewsController] Error fetching news categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch news categories',
      message: error.message,
    });
  }
};

// Get news statistics for the user
export const getNewsStatistics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const [
      totalItems,
      unreadItems,
      favoriteItems,
      archivedItems,
      last24Hours,
      last7Days,
    ] = await Promise.all([
      NewsItem.countDocuments({ userId: userObjectId }),
      NewsItem.countDocuments({ userId: userObjectId, isRead: false }),
      NewsItem.countDocuments({ userId: userObjectId, isFavorite: true }),
      NewsItem.countDocuments({ userId: userObjectId, status: 'archived' }),
      NewsItem.countDocuments({
        userId: userObjectId,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      }),
      NewsItem.countDocuments({
        userId: userObjectId,
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalItems,
        unreadItems,
        favoriteItems,
        archivedItems,
        last24Hours,
        last7Days,
        readPercentage: totalItems > 0 ? Math.round(((totalItems - unreadItems) / totalItems) * 100) : 0,
      },
    });
  } catch (error: any) {
    console.error('[NewsController] Error fetching news statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch news statistics',
      message: error.message,
    });
  }
};

// Bulk mark as read
export const bulkMarkAsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { newsIds } = req.body; // Array of news item IDs

    if (!Array.isArray(newsIds) || newsIds.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Invalid or empty newsIds array',
      });
      return;
    }

    const result = await NewsItem.updateMany(
      {
        _id: { $in: newsIds },
        userId: new mongoose.Types.ObjectId(userId),
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      }
    );

    res.json({
      success: true,
      data: {
        modifiedCount: result.modifiedCount,
      },
      message: `${result.modifiedCount} news items marked as read`,
    });
  } catch (error: any) {
    console.error('[NewsController] Error bulk marking as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark news items as read',
      message: error.message,
    });
  }
};