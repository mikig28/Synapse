import { AxiosError } from 'axios';

export interface ErrorInfo {
  type: string;
  message: string;
  statusCode?: number;
  originalError: any;
  timestamp: string;
  context?: any;
  suggestions?: string[];
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errors: ErrorInfo[] = [];

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  processError(error: any, context?: any): ErrorInfo {
    const timestamp = new Date().toISOString();
    let errorInfo: ErrorInfo;

    if (this.isAxiosError(error)) {
      errorInfo = this.processAxiosError(error, context, timestamp);
    } else if (error instanceof Error) {
      errorInfo = this.processStandardError(error, context, timestamp);
    } else {
      errorInfo = this.processUnknownError(error, context, timestamp);
    }

    this.logError(errorInfo);
    this.errors.push(errorInfo);
    
    // Keep only last 100 errors to prevent memory issues
    if (this.errors.length > 100) {
      this.errors = this.errors.slice(-100);
    }

    return errorInfo;
  }

  private isAxiosError(error: any): error is AxiosError {
    return error.isAxiosError === true;
  }

  private processAxiosError(error: AxiosError, context: any, timestamp: string): ErrorInfo {
    const response = error.response;
    const statusCode = response?.status;
    const responseData = response?.data as any;

    let type = 'network_error';
    let message = error.message;
    let suggestions: string[] = [];

    if (statusCode) {
      switch (statusCode) {
        case 400:
          type = 'bad_request';
          message = responseData?.message || 'Invalid request data';
          suggestions = this.getBadRequestSuggestions(responseData);
          break;
        case 401:
          type = 'unauthorized';
          message = 'Authentication failed. Please log in again.';
          suggestions = ['Please refresh the page and log in again'];
          break;
        case 403:
          type = 'forbidden';
          message = 'You do not have permission to perform this action';
          suggestions = ['Check if you have the right permissions', 'Contact support if needed'];
          break;
        case 404:
          type = 'not_found';
          message = responseData?.message || 'The requested resource was not found';
          suggestions = ['Check if the agent exists', 'Refresh the page to reload data'];
          break;
        case 409:
          type = 'conflict';
          message = responseData?.message || 'Request conflicts with current state';
          suggestions = this.getConflictSuggestions(responseData);
          break;
        case 501:
          type = 'not_implemented';
          message = responseData?.message || 'Feature not implemented';
          suggestions = ['This agent type may not be supported yet', 'Try a different agent type'];
          break;
        case 503:
          type = 'service_unavailable';
          message = 'External service is temporarily unavailable';
          suggestions = this.getServiceUnavailableSuggestions();
          break;
        case 504:
          type = 'timeout';
          message = 'Service request timed out';
          suggestions = ['Try again in a few moments', 'The service may be starting up'];
          break;
        default:
          type = 'server_error';
          message = `Server error (${statusCode}): ${responseData?.message || error.message}`;
      }
    }

    return {
      type,
      message,
      statusCode,
      originalError: error,
      timestamp,
      context: {
        ...context,
        url: error.config?.url,
        method: error.config?.method,
        requestData: error.config?.data,
        responseData: responseData,
        errorType: responseData?.errorType
      },
      suggestions
    };
  }

  private processStandardError(error: Error, context: any, timestamp: string): ErrorInfo {
    return {
      type: 'javascript_error',
      message: error.message,
      originalError: error,
      timestamp,
      context,
      suggestions: ['This is an unexpected error. Please try refreshing the page.']
    };
  }

  private processUnknownError(error: any, context: any, timestamp: string): ErrorInfo {
    return {
      type: 'unknown_error',
      message: String(error),
      originalError: error,
      timestamp,
      context,
      suggestions: ['An unexpected error occurred. Please try again.']
    };
  }

  private getBadRequestSuggestions(responseData: any): string[] {
    const errorType = responseData?.errorType;
    const suggestions: string[] = [];

    switch (errorType) {
      case 'agent_not_found':
        suggestions.push('The agent may have been deleted', 'Refresh the page to reload agents');
        break;
      case 'agent_inactive':
        suggestions.push('Activate the agent before running it', 'Check agent settings');
        break;
      case 'agent_already_running':
        suggestions.push('Wait for the current execution to complete', 'Check the agent status dashboard');
        break;
      case 'executor_not_available':
        suggestions.push('This agent type may not be supported', 'Contact support for help with this agent type');
        break;
      default:
        suggestions.push('Check the agent configuration', 'Try again in a few moments');
    }

    return suggestions;
  }

  private getConflictSuggestions(responseData: any): string[] {
    const errorType = responseData?.errorType;
    
    if (errorType === 'agent_already_running') {
      return [
        'Wait for the current execution to finish',
        'Check the agent activity dashboard for progress',
        'You can only run one instance of an agent at a time'
      ];
    }
    
    return ['The request conflicts with the current state', 'Try again in a few moments'];
  }

  private getServiceUnavailableSuggestions(): string[] {
    return [
      'The AI service may be starting up (this can take 30-60 seconds)',
      'Try again in a few moments',
      'Check the service status on the dashboard',
      'Contact support if the issue persists'
    ];
  }

  private logError(errorInfo: ErrorInfo): void {
    console.group(`🚨 [ErrorHandler] ${errorInfo.type.toUpperCase()}`);
    console.error('Message:', errorInfo.message);
    console.error('Status Code:', errorInfo.statusCode);
    console.error('Timestamp:', errorInfo.timestamp);
    console.error('Context:', errorInfo.context);
    console.error('Suggestions:', errorInfo.suggestions);
    console.error('Original Error:', errorInfo.originalError);
    console.groupEnd();
  }

  getErrors(): ErrorInfo[] {
    return [...this.errors];
  }

  clearErrors(): void {
    this.errors = [];
  }

  getErrorsByType(type: string): ErrorInfo[] {
    return this.errors.filter(error => error.type === type);
  }

  getRecentErrors(minutes: number = 5): ErrorInfo[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000).toISOString();
    return this.errors.filter(error => error.timestamp > cutoff);
  }

  static processError(error: any, context?: any): ErrorInfo {
    return ErrorHandler.getInstance().processError(error, context);
  }
}

export default ErrorHandler;