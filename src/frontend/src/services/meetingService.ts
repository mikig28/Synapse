import axiosInstance from './axiosConfig';

export interface Meeting {
  _id: string;
  userId: string;
  title: string;
  description?: string;
  audioFilePath?: string;
  audioFileName?: string;
  audioFileSize?: number;
  duration?: number;
  transcription?: string;
  summary?: string;
  keyHighlights?: string[];
  extractedTasks?: Array<{
    title: string;
    description?: string;
    priority?: 'low' | 'medium' | 'high';
    taskId?: string;
  }>;
  extractedNotes?: Array<{
    content: string;
    noteId?: string;
  }>;
  transcriptionMethod?: 'local' | 'api' | 'dedicated';
  status: 'recording' | 'processing' | 'completed' | 'failed';
  processingProgress?: number;
  errorMessage?: string;
  meetingDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingStats {
  totalMeetings: number;
  completedMeetings: number;
  processingMeetings: number;
  failedMeetings: number;
  recentMeetings: number;
}

export interface CreateMeetingData {
  title: string;
  description?: string;
  meetingDate?: string;
  transcriptionMethod?: 'local' | 'api' | 'dedicated';
}

export interface UpdateMeetingData {
  title?: string;
  description?: string;
  meetingDate?: string;
}

export interface ProcessTranscriptionData {
  transcription: string;
}

export interface MeetingsResponse {
  meetings: Meeting[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

class MeetingService {
  private baseURL = '/meetings';

  /**
   * Get all meetings for the authenticated user
   */
  async getMeetings(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<MeetingsResponse> {
    try {
      const response = await axiosInstance.get(this.baseURL, { params });
      return response.data as MeetingsResponse;
    } catch (error) {
      console.error('[MeetingService]: Error fetching meetings:', error);
      throw error;
    }
  }

  /**
   * Upload audio for a meeting to be transcribed
   */
  async uploadAudioForTranscription(id: string, audioFile: File): Promise<{
    message: string;
    meeting: {
      _id: string;
      status: string;
      processingProgress: number;
    };
  }> {
    try {
      const formData = new FormData();
      formData.append('audioFile', audioFile); // Changed from 'audio' to 'audioFile' to match backend

      const response = await axiosInstance.post(
        `${this.baseURL}/${id}/upload-audio`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      return response.data as {
        message: string;
        meeting: {
          _id: string;
          status: string;
          processingProgress: number;
        };
      };
    } catch (error) {
      console.error(`[MeetingService]: Error uploading audio for meeting ${id}:`, error);
      throw error; // Re-throw the error to be caught by the calling component
    }
  }

  /**
   * Get a specific meeting by ID
   */
  async getMeeting(id: string): Promise<Meeting> {
    try {
      const response = await axiosInstance.get(`${this.baseURL}/${id}`);
      return response.data as Meeting;
    } catch (error) {
      console.error('[MeetingService]: Error fetching meeting:', error);
      throw error;
    }
  }

  /**
   * Create a new meeting
   */
  async createMeeting(data: CreateMeetingData): Promise<Meeting> {
    try {
      const response = await axiosInstance.post(this.baseURL, data);
      return response.data as Meeting;
    } catch (error) {
      console.error('[MeetingService]: Error creating meeting:', error);
      throw error;
    }
  }

  /**
   * Update an existing meeting
   */
  async updateMeeting(id: string, data: UpdateMeetingData): Promise<Meeting> {
    try {
      const response = await axiosInstance.put(`${this.baseURL}/${id}`, data);
      return response.data as Meeting;
    } catch (error) {
      console.error('[MeetingService]: Error updating meeting:', error);
      throw error;
    }
  }

  /**
   * Delete a meeting
   */
  async deleteMeeting(id: string): Promise<void> {
    try {
      await axiosInstance.delete(`${this.baseURL}/${id}`);
    } catch (error) {
      console.error('[MeetingService]: Error deleting meeting:', error);
      throw error;
    }
  }

  /**
   * Process transcription for a meeting
   */
  async processTranscription(id: string, data: ProcessTranscriptionData): Promise<{
    message: string;
    meeting: {
      _id: string;
      status: string;
      processingProgress: number;
    };
  }> {
    try {
      const response = await axiosInstance.post(`${this.baseURL}/${id}/transcription`, data);
      return response.data as {
        message: string;
        meeting: {
          _id: string;
          status: string;
          processingProgress: number;
        };
      };
    } catch (error) {
      console.error('[MeetingService]: Error processing transcription:', error);
      throw error;
    }
  }

  /**
   * Reprocess a meeting (re-run analysis)
   */
  async reprocessMeeting(id: string): Promise<{
    message: string;
    meeting: {
      _id: string;
      status: string;
      processingProgress: number;
    };
  }> {
    try {
      const response = await axiosInstance.post(`${this.baseURL}/${id}/reprocess`);
      return response.data as {
        message: string;
        meeting: {
          _id: string;
          status: string;
          processingProgress: number;
        };
      };
    } catch (error) {
      console.error('[MeetingService]: Error reprocessing meeting:', error);
      throw error;
    }
  }

  /**
   * Get meeting statistics
   */
  async getMeetingStats(): Promise<MeetingStats> {
    try {
      const response = await axiosInstance.get(`${this.baseURL}/stats`);
      return response.data as MeetingStats;
    } catch (error) {
      console.error('[MeetingService]: Error fetching meeting stats:', error);
      throw error;
    }
  }

  /**
   * Poll meeting status until completion or failure
   */
  async pollMeetingStatus(
    id: string,
    onProgress?: (meeting: Meeting) => void,
    maxAttempts: number = 60,
    intervalMs: number = 2000
  ): Promise<Meeting> {
    let attempts = 0;
    
    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          attempts++;
          const meeting = await this.getMeeting(id);
          
          if (onProgress) {
            onProgress(meeting);
          }
          
          if (meeting.status === 'completed') {
            resolve(meeting);
            return;
          }
          
          if (meeting.status === 'failed') {
            reject(new Error(meeting.errorMessage || 'Meeting processing failed'));
            return;
          }
          
          if (attempts >= maxAttempts) {
            reject(new Error('Polling timeout: Meeting processing took too long'));
            return;
          }
          
          // Continue polling if still processing
          if (meeting.status === 'processing') {
            setTimeout(poll, intervalMs);
          } else {
            resolve(meeting);
          }
        } catch (error) {
          reject(error);
        }
      };
      
      poll();
    });
  }

  /**
   * Format meeting date for display
   */
  formatMeetingDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Get status color for UI display
   */
  getStatusColor(status: Meeting['status']): string {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'processing':
        return 'text-blue-600';
      case 'failed':
        return 'text-red-600';
      case 'recording':
        return 'text-orange-600';
      default:
        return 'text-gray-600';
    }
  }

  /**
   * Get status display text
   */
  getStatusText(status: Meeting['status']): string {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'processing':
        return 'Processing';
      case 'failed':
        return 'Failed';
      case 'recording':
        return 'Recording';
      default:
        return 'Unknown';
    }
  }

  /**
   * Calculate estimated reading time for transcription
   */
  getEstimatedReadingTime(transcription?: string): string {
    if (!transcription) return '0 min';
    
    const wordsPerMinute = 200;
    const wordCount = transcription.split(/\s+/).length;
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    
    return `${minutes} min read`;
  }

  /**
   * Get priority color for extracted tasks
   */
  getPriorityColor(priority?: 'low' | 'medium' | 'high'): string {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'low':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  }
}

export default new MeetingService();
