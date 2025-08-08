import axiosInstance from './axiosConfig';

export interface FeedbackSubmission {
  type: 'bug' | 'feature' | 'improvement' | 'general' | 'rating';
  category: 'ui' | 'performance' | 'functionality' | 'content' | 'mobile' | 'other';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  rating?: number; // 1-5 for rating feedback
  title: string;
  description: string;
  steps?: string; // For bug reports
  expectedBehavior?: string;
  actualBehavior?: string;
  email?: string; // For anonymous feedback
  tags?: string[];
}

export interface Feedback {
  _id: string;
  userId?: string;
  email?: string;
  type: string;
  category: string;
  priority: string;
  rating?: number;
  title: string;
  description: string;
  steps?: string;
  expectedBehavior?: string;
  actualBehavior?: string;
  browserInfo?: {
    userAgent: string;
    platform: string;
    language: string;
    viewport: { width: number; height: number };
  };
  context?: {
    page: string;
    url: string;
    feature: string;
    sessionId?: string;
  };
  status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'duplicate';
  tags: string[];
  votes: {
    upvotes: number;
    downvotes: number;
    userVotes: Map<string, 'up' | 'down'>;
  };
  voteScore: number;
  displayName: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export interface FeedbackStats {
  overview: {
    total: number;
    averageRating: number;
    openCount: number;
    resolvedCount: number;
  };
  topIssues: Feedback[];
  trends: Array<{
    _id: { date: string; type: string };
    count: number;
  }>;
}

class FeedbackService {
  private baseUrl = '/feedback';

  /**
   * Get browser and context information
   */
  private getBrowserInfo() {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };
  }

  /**
   * Get current page context
   */
  private getPageContext() {
    return {
      page: document.title,
      url: window.location.href,
      feature: window.location.pathname.split('/')[1] || 'home',
      sessionId: sessionStorage.getItem('session-id') || undefined
    };
  }

  /**
   * Submit feedback
   */
  async submitFeedback(feedback: FeedbackSubmission): Promise<{ success: boolean; data: Feedback; message: string }> {
    try {
      const payload = {
        ...feedback,
        browserInfo: this.getBrowserInfo(),
        context: this.getPageContext()
      };

      const response = await axiosInstance.post(this.baseUrl, payload);
      return response.data;
    } catch (error: any) {
      console.error('Feedback submission error:', error);
      throw new Error(error.response?.data?.error || 'Failed to submit feedback');
    }
  }

  /**
   * Get feedback list with filtering
   */
  async getFeedback(params: {
    page?: number;
    limit?: number;
    type?: string;
    category?: string;
    status?: string;
    priority?: string;
    search?: string;
    tags?: string[];
  } = {}): Promise<{
    feedback: Feedback[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      const response = await axiosInstance.get(this.baseUrl, { params });
      return response.data.data;
    } catch (error: any) {
      console.error('Get feedback error:', error);
      throw new Error(error.response?.data?.error || 'Failed to get feedback');
    }
  }

  /**
   * Get single feedback by ID
   */
  async getFeedbackById(id: string): Promise<Feedback> {
    try {
      const response = await axiosInstance.get(`${this.baseUrl}/${id}`);
      return response.data.data;
    } catch (error: any) {
      console.error('Get feedback by ID error:', error);
      throw new Error(error.response?.data?.error || 'Failed to get feedback');
    }
  }

  /**
   * Vote on feedback
   */
  async voteFeedback(id: string, vote: 'up' | 'down' | null): Promise<{
    id: string;
    upvotes: number;
    downvotes: number;
    userVote: 'up' | 'down' | null;
  }> {
    try {
      const response = await axiosInstance.post(`${this.baseUrl}/${id}/vote`, { vote });
      return response.data.data;
    } catch (error: any) {
      console.error('Vote feedback error:', error);
      throw new Error(error.response?.data?.error || 'Failed to vote on feedback');
    }
  }

  /**
   * Get user's own feedback
   */
  async getUserFeedback(params: {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
  } = {}): Promise<{
    feedback: Feedback[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      const response = await axiosInstance.get(`${this.baseUrl}/my-feedback`, { params });
      return response.data.data;
    } catch (error: any) {
      console.error('Get user feedback error:', error);
      throw new Error(error.response?.data?.error || 'Failed to get user feedback');
    }
  }

  /**
   * Get feedback statistics
   */
  async getFeedbackStats(): Promise<FeedbackStats> {
    try {
      const response = await axiosInstance.get(`${this.baseUrl}/stats`);
      return response.data.data;
    } catch (error: any) {
      console.error('Get feedback stats error:', error);
      throw new Error(error.response?.data?.error || 'Failed to get feedback statistics');
    }
  }

  /**
   * Quick feedback submission for common scenarios
   */
  async submitQuickFeedback(type: 'bug' | 'feature' | 'improvement', title: string, description: string) {
    const category = type === 'bug' ? 'functionality' : 'other';
    const priority = type === 'bug' ? 'medium' : 'low';

    return this.submitFeedback({
      type,
      category,
      priority,
      title,
      description
    });
  }

  /**
   * Submit rating feedback
   */
  async submitRating(rating: number, title?: string, description?: string) {
    return this.submitFeedback({
      type: 'rating',
      category: 'other',
      priority: 'low',
      rating,
      title: title || `User Rating: ${rating}/5`,
      description: description || `User gave a ${rating} star rating`
    });
  }

  /**
   * Get feedback templates for common issues
   */
  getFeedbackTemplates() {
    return {
      bug: {
        title: 'Bug Report: [Brief description]',
        description: 'Please describe what happened and what you expected to happen.',
        steps: '1. Go to...\n2. Click on...\n3. See error',
        expectedBehavior: 'What should have happened',
        actualBehavior: 'What actually happened'
      },
      feature: {
        title: 'Feature Request: [Feature name]',
        description: 'Please describe the feature you\'d like to see and why it would be useful.',
        steps: undefined,
        expectedBehavior: undefined,
        actualBehavior: undefined
      },
      improvement: {
        title: 'Improvement Suggestion: [Area to improve]',
        description: 'Please describe what could be improved and how.',
        steps: undefined,
        expectedBehavior: undefined,
        actualBehavior: undefined
      }
    };
  }

  /**
   * Validate feedback submission
   */
  validateFeedback(feedback: FeedbackSubmission): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!feedback.title?.trim()) {
      errors.push('Title is required');
    } else if (feedback.title.length > 200) {
      errors.push('Title must be less than 200 characters');
    }

    if (!feedback.description?.trim()) {
      errors.push('Description is required');
    } else if (feedback.description.length > 2000) {
      errors.push('Description must be less than 2000 characters');
    }

    if (feedback.type === 'rating') {
      if (!feedback.rating || feedback.rating < 1 || feedback.rating > 5) {
        errors.push('Rating must be between 1 and 5');
      }
    }

    if (feedback.steps && feedback.steps.length > 1000) {
      errors.push('Steps must be less than 1000 characters');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export const feedbackService = new FeedbackService();
export default feedbackService;