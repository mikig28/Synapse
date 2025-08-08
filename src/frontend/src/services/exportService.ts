import axiosInstance from './axiosConfig';

export interface ExportJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  totalItems: number;
  processedItems: number;
  downloadUrl?: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
  expiresAt: string;
  format: string;
  contentTypes: string[];
}

export interface ExportRequest {
  format: 'json' | 'csv' | 'pdf' | 'zip';
  contentTypes: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  includeMetadata?: boolean;
  anonymize?: boolean;
}

class ExportService {
  private baseUrl = '/export';

  /**
   * Create a new export job
   */
  async createExport(request: ExportRequest): Promise<{ jobId: string; status: string; message: string }> {
    try {
      const response = await axiosInstance.post(this.baseUrl, request);
      return response.data.data;
    } catch (error: any) {
      console.error('Export creation error:', error);
      throw new Error(error.response?.data?.error || 'Failed to create export');
    }
  }

  /**
   * Get export job status
   */
  async getExportStatus(jobId: string): Promise<ExportJob> {
    try {
      const response = await axiosInstance.get(`${this.baseUrl}/${jobId}/status`);
      return response.data.data;
    } catch (error: any) {
      console.error('Export status error:', error);
      throw new Error(error.response?.data?.error || 'Failed to get export status');
    }
  }

  /**
   * Download export file
   */
  async downloadExport(jobId: string, filename?: string): Promise<void> {
    try {
      const response = await axiosInstance.get(`${this.baseUrl}/${jobId}/download`, {
        responseType: 'blob'
      });

      // Create download link
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from headers or use default
      const contentDisposition = response.headers['content-disposition'];
      const defaultFilename = filename || `synapse-export-${jobId}`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        link.download = filenameMatch ? filenameMatch[1] : defaultFilename;
      } else {
        link.download = defaultFilename;
      }
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error: any) {
      console.error('Export download error:', error);
      throw new Error(error.response?.data?.error || 'Failed to download export');
    }
  }

  /**
   * Get export history
   */
  async getExportHistory(): Promise<ExportJob[]> {
    try {
      const response = await axiosInstance.get(`${this.baseUrl}/history`);
      return response.data.data;
    } catch (error: any) {
      console.error('Export history error:', error);
      throw new Error(error.response?.data?.error || 'Failed to get export history');
    }
  }

  /**
   * Monitor export progress with polling
   */
  async monitorExport(
    jobId: string,
    onProgress: (job: ExportJob) => void,
    pollInterval: number = 2000
  ): Promise<ExportJob> {
    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const job = await this.getExportStatus(jobId);
          onProgress(job);

          if (job.status === 'completed') {
            resolve(job);
          } else if (job.status === 'failed') {
            reject(new Error(job.error || 'Export failed'));
          } else if (job.status === 'processing' || job.status === 'pending') {
            setTimeout(poll, pollInterval);
          }
        } catch (error) {
          reject(error);
        }
      };

      poll();
    });
  }

  /**
   * Estimate export size (rough calculation)
   */
  getEstimatedSize(contentTypes: string[], itemCounts: Record<string, number>): string {
    let totalItems = 0;
    let estimatedBytes = 0;

    for (const type of contentTypes) {
      if (type === 'all') {
        totalItems = Object.values(itemCounts).reduce((sum, count) => sum + count, 0);
        break;
      } else {
        totalItems += itemCounts[type] || 0;
      }
    }

    // Rough estimates per item type (in bytes)
    const itemSizeEstimates = {
      documents: 5000,  // 5KB average
      notes: 1000,      // 1KB average
      bookmarks: 500,   // 500B average
      tasks: 300,       // 300B average
      ideas: 800,       // 800B average
      videos: 2000,     // 2KB average (metadata only)
      news: 3000,       // 3KB average
      telegram: 400,    // 400B average
      meetings: 4000,   // 4KB average
      whatsapp: 200     // 200B average
    };

    const avgItemSize = 1500; // Default average
    estimatedBytes = totalItems * avgItemSize;

    // Format size
    if (estimatedBytes < 1024) {
      return `${estimatedBytes} bytes`;
    } else if (estimatedBytes < 1024 * 1024) {
      return `${Math.round(estimatedBytes / 1024)} KB`;
    } else if (estimatedBytes < 1024 * 1024 * 1024) {
      return `${Math.round(estimatedBytes / (1024 * 1024))} MB`;
    } else {
      return `${Math.round(estimatedBytes / (1024 * 1024 * 1024) * 10) / 10} GB`;
    }
  }

  /**
   * Get content type info for UI
   */
  getContentTypeInfo(): Array<{
    key: string;
    label: string;
    description: string;
    icon: string;
  }> {
    return [
      {
        key: 'all',
        label: 'All Content',
        description: 'Export everything',
        icon: '🌐'
      },
      {
        key: 'documents',
        label: 'Documents',
        description: 'PDF uploads, text documents',
        icon: '📄'
      },
      {
        key: 'notes',
        label: 'Notes',
        description: 'Personal notes and transcriptions',
        icon: '📝'
      },
      {
        key: 'bookmarks',
        label: 'Bookmarks',
        description: 'Saved links and web content',
        icon: '🔖'
      },
      {
        key: 'tasks',
        label: 'Tasks',
        description: 'Todo items and project tasks',
        icon: '✅'
      },
      {
        key: 'ideas',
        label: 'Ideas',
        description: 'Creative ideas and brainstorms',
        icon: '💡'
      },
      {
        key: 'videos',
        label: 'Videos',
        description: 'Video summaries and transcripts',
        icon: '🎥'
      },
      {
        key: 'news',
        label: 'News',
        description: 'News articles and summaries',
        icon: '📰'
      },
      {
        key: 'telegram',
        label: 'Telegram',
        description: 'Telegram messages and media',
        icon: '💬'
      },
      {
        key: 'meetings',
        label: 'Meetings',
        description: 'Meeting recordings and notes',
        icon: '🎤'
      },
      {
        key: 'whatsapp',
        label: 'WhatsApp',
        description: 'WhatsApp messages and groups',
        icon: '📱'
      }
    ];
  }

  /**
   * Get format descriptions
   */
  getFormatInfo(): Array<{
    key: string;
    label: string;
    description: string;
    fileExtension: string;
    pros: string[];
    cons: string[];
  }> {
    return [
      {
        key: 'json',
        label: 'JSON',
        description: 'Structured data format',
        fileExtension: '.json',
        pros: ['Complete data preservation', 'Machine readable', 'Compact'],
        cons: ['Not human-friendly', 'Requires technical knowledge']
      },
      {
        key: 'csv',
        label: 'CSV',
        description: 'Comma-separated values',
        fileExtension: '.csv',
        pros: ['Excel compatible', 'Human readable', 'Widely supported'],
        cons: ['Limited structure', 'May lose formatting']
      },
      {
        key: 'pdf',
        label: 'PDF',
        description: 'Printable document',
        fileExtension: '.pdf',
        pros: ['Human readable', 'Printable', 'Professional format'],
        cons: ['Large file size', 'Not editable', 'Summary only']
      },
      {
        key: 'zip',
        label: 'ZIP Archive',
        description: 'Multiple formats in one file',
        fileExtension: '.zip',
        pros: ['Best of all formats', 'Complete backup', 'Organized'],
        cons: ['Larger file size', 'Requires extraction']
      }
    ];
  }

  /**
   * Validate export request
   */
  validateExportRequest(request: ExportRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!request.format) {
      errors.push('Export format is required');
    } else if (!['json', 'csv', 'pdf', 'zip'].includes(request.format)) {
      errors.push('Invalid export format');
    }

    if (!request.contentTypes || request.contentTypes.length === 0) {
      errors.push('At least one content type must be selected');
    }

    if (request.dateRange) {
      if (!request.dateRange.start || !request.dateRange.end) {
        errors.push('Both start and end dates are required for date range');
      } else {
        const startDate = new Date(request.dateRange.start);
        const endDate = new Date(request.dateRange.end);
        
        if (startDate > endDate) {
          errors.push('Start date must be before end date');
        }
        
        if (endDate > new Date()) {
          errors.push('End date cannot be in the future');
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export const exportService = new ExportService();
export default exportService;