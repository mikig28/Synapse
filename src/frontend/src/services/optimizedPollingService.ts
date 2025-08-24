/**
 * Optimized Polling Service
 * Implements exponential backoff, reduced frequency, and intelligent error handling
 */

interface PollingOptions {
  baseInterval: number;
  maxInterval: number;
  maxRetries: number;
  backoffMultiplier: number;
  enableAdaptivePolling: boolean;
  enableCircuitBreaker: boolean;
}

interface RequestConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  headers?: Record<string, string>;
}

interface PollingState {
  consecutiveFailures: number;
  currentInterval: number;
  lastSuccessTime: number;
  isCircuitBreakerOpen: boolean;
  circuitBreakerOpenTime: number;
  adaptiveMultiplier: number;
}

interface PollingStats {
  totalRequests: number;
  successCount: number;
  failureCount: number;
  averageResponseTime: number;
  circuitBreakerTrips: number;
}

export class OptimizedPollingService {
  private static instance: OptimizedPollingService | null = null;
  private activePollers = new Map<string, number>(); // pollerId -> intervalId
  private pollingStates = new Map<string, PollingState>();
  private pollingStats = new Map<string, PollingStats>();
  private abortControllers = new Map<string, AbortController>();
  
  // Circuit breaker configuration
  private readonly CIRCUIT_BREAKER_FAILURE_THRESHOLD = 5;
  private readonly CIRCUIT_BREAKER_RESET_TIME = 30000; // 30 seconds
  private readonly CIRCUIT_BREAKER_HALF_OPEN_REQUESTS = 3;

  private constructor() {}

  public static getInstance(): OptimizedPollingService {
    if (!OptimizedPollingService.instance) {
      OptimizedPollingService.instance = new OptimizedPollingService();
    }
    return OptimizedPollingService.instance;
  }

  /**
   * Start intelligent polling with exponential backoff
   */
  public startPolling(
    pollerId: string,
    requestFn: () => Promise<any>,
    onSuccess: (data: any) => void,
    onError: (error: Error) => void,
    options: Partial<PollingOptions> = {}
  ): void {
    // Stop existing poller if running
    this.stopPolling(pollerId);

    const config: PollingOptions = {
      baseInterval: 30000,        // 30 seconds default
      maxInterval: 300000,        // 5 minutes max
      maxRetries: 3,
      backoffMultiplier: 2,
      enableAdaptivePolling: true,
      enableCircuitBreaker: true,
      ...options
    };

    // Initialize state
    this.initializePollingState(pollerId, config);

    const poll = async () => {
      const state = this.pollingStates.get(pollerId)!;
      const stats = this.pollingStats.get(pollerId)!;

      // Check circuit breaker
      if (this.isCircuitBreakerOpen(pollerId)) {
        console.log(`[${pollerId}] Circuit breaker open, skipping poll`);
        this.scheduleNextPoll(pollerId, poll, config);
        return;
      }

      // Create abort controller for this request
      const abortController = new AbortController();
      this.abortControllers.set(pollerId, abortController);

      const startTime = Date.now();
      
      try {
        console.log(`[${pollerId}] Polling (interval: ${state.currentInterval}ms, failures: ${state.consecutiveFailures})`);
        
        // Execute request with timeout and abort signal
        const data = await Promise.race([
          requestFn(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), 15000)
          )
        ]);

        // Success handling
        const responseTime = Date.now() - startTime;
        this.handleSuccess(pollerId, responseTime);
        onSuccess(data);

      } catch (error) {
        const responseTime = Date.now() - startTime;
        const handledError = this.handleError(pollerId, error as Error, responseTime);
        onError(handledError);
        
        // Don't continue if circuit breaker opened
        if (this.isCircuitBreakerOpen(pollerId)) {
          return;
        }
      } finally {
        this.abortControllers.delete(pollerId);
      }

      // Schedule next poll
      this.scheduleNextPoll(pollerId, poll, config);
    };

    // Start first poll with delay to avoid initial rush
    setTimeout(() => poll(), 1000);
    console.log(`[${pollerId}] Polling started with base interval: ${config.baseInterval}ms`);
  }

  /**
   * Stop polling for a specific poller
   */
  public stopPolling(pollerId: string): void {
    const intervalId = this.activePollers.get(pollerId);
    if (intervalId) {
      clearTimeout(intervalId);
      this.activePollers.delete(pollerId);
    }

    // Cancel ongoing request
    const abortController = this.abortControllers.get(pollerId);
    if (abortController) {
      abortController.abort();
      this.abortControllers.delete(pollerId);
    }

    console.log(`[${pollerId}] Polling stopped`);
  }

  /**
   * Get polling statistics
   */
  public getStats(pollerId: string): PollingStats | null {
    return this.pollingStats.get(pollerId) || null;
  }

  /**
   * Reset circuit breaker manually
   */
  public resetCircuitBreaker(pollerId: string): void {
    const state = this.pollingStates.get(pollerId);
    if (state) {
      state.isCircuitBreakerOpen = false;
      state.circuitBreakerOpenTime = 0;
      state.consecutiveFailures = 0;
      console.log(`[${pollerId}] Circuit breaker reset manually`);
    }
  }

  /**
   * Get all active pollers
   */
  public getActivePollers(): string[] {
    return Array.from(this.activePollers.keys());
  }

  /**
   * Stop all active pollers
   */
  public stopAllPolling(): void {
    const pollers = this.getActivePollers();
    pollers.forEach(pollerId => this.stopPolling(pollerId));
    console.log(`Stopped ${pollers.length} active pollers`);
  }

  private initializePollingState(pollerId: string, config: PollingOptions): void {
    this.pollingStates.set(pollerId, {
      consecutiveFailures: 0,
      currentInterval: config.baseInterval,
      lastSuccessTime: Date.now(),
      isCircuitBreakerOpen: false,
      circuitBreakerOpenTime: 0,
      adaptiveMultiplier: 1
    });

    this.pollingStats.set(pollerId, {
      totalRequests: 0,
      successCount: 0,
      failureCount: 0,
      averageResponseTime: 0,
      circuitBreakerTrips: 0
    });
  }

  private handleSuccess(pollerId: string, responseTime: number): void {
    const state = this.pollingStates.get(pollerId)!;
    const stats = this.pollingStats.get(pollerId)!;

    // Reset failure state
    state.consecutiveFailures = 0;
    state.lastSuccessTime = Date.now();

    // Close circuit breaker if it was open
    if (state.isCircuitBreakerOpen) {
      state.isCircuitBreakerOpen = false;
      state.circuitBreakerOpenTime = 0;
      console.log(`[${pollerId}] Circuit breaker closed after successful request`);
    }

    // Adaptive interval adjustment - speed up if consistently successful
    if (stats.successCount > 0 && stats.successCount % 5 === 0) {
      state.adaptiveMultiplier = Math.max(0.8, state.adaptiveMultiplier * 0.9);
    }

    // Update stats
    stats.totalRequests++;
    stats.successCount++;
    stats.averageResponseTime = (stats.averageResponseTime * (stats.totalRequests - 1) + responseTime) / stats.totalRequests;

    // Reset to base interval on success
    state.currentInterval = Math.max(
      1000, // Minimum 1 second
      30000 * state.adaptiveMultiplier // Base interval with adaptive multiplier
    );
  }

  private handleError(pollerId: string, error: Error, responseTime: number): Error {
    const state = this.pollingStates.get(pollerId)!;
    const stats = this.pollingStats.get(pollerId)!;

    state.consecutiveFailures++;
    stats.totalRequests++;
    stats.failureCount++;

    // Exponential backoff calculation
    const backoffMultiplier = this.getBackoffMultiplier(error);
    state.currentInterval = Math.min(
      300000, // Max 5 minutes
      30000 * Math.pow(backoffMultiplier, state.consecutiveFailures)
    );

    // Adaptive slowdown on repeated failures
    if (state.consecutiveFailures > 2) {
      state.adaptiveMultiplier = Math.min(2, state.adaptiveMultiplier * 1.2);
    }

    console.log(`[${pollerId}] Error (${state.consecutiveFailures} consecutive): ${error.message}`);
    console.log(`[${pollerId}] Next poll in ${state.currentInterval}ms`);

    // Check if circuit breaker should trip
    if (state.consecutiveFailures >= this.CIRCUIT_BREAKER_FAILURE_THRESHOLD) {
      this.tripCircuitBreaker(pollerId);
    }

    // Return enhanced error with polling context
    const enhancedError = new Error(`${error.message} (Attempt ${state.consecutiveFailures}, Next retry: ${state.currentInterval}ms)`);
    enhancedError.name = error.name;
    return enhancedError;
  }

  private getBackoffMultiplier(error: Error): number {
    // Different backoff strategies based on error type
    if (error.message.includes('502') || error.message.includes('503')) {
      return 2.5; // Aggressive backoff for server errors
    }
    if (error.message.includes('429') || error.message.includes('rate limit')) {
      return 3; // Very aggressive for rate limiting
    }
    if (error.message.includes('timeout')) {
      return 1.8; // Moderate for timeouts
    }
    if (error.message.includes('Network Error') || error.message.includes('Failed to fetch')) {
      return 2.2; // Aggressive for network issues
    }
    return 2; // Default exponential backoff
  }

  private tripCircuitBreaker(pollerId: string): void {
    const state = this.pollingStates.get(pollerId)!;
    const stats = this.pollingStats.get(pollerId)!;

    state.isCircuitBreakerOpen = true;
    state.circuitBreakerOpenTime = Date.now();
    stats.circuitBreakerTrips++;

    console.log(`[${pollerId}] Circuit breaker OPENED after ${state.consecutiveFailures} failures`);
    console.log(`[${pollerId}] Circuit breaker will reset in ${this.CIRCUIT_BREAKER_RESET_TIME}ms`);
  }

  private isCircuitBreakerOpen(pollerId: string): boolean {
    const state = this.pollingStates.get(pollerId);
    if (!state || !state.isCircuitBreakerOpen) return false;

    // Check if circuit breaker should reset
    if (Date.now() - state.circuitBreakerOpenTime > this.CIRCUIT_BREAKER_RESET_TIME) {
      state.isCircuitBreakerOpen = false;
      state.circuitBreakerOpenTime = 0;
      state.consecutiveFailures = 0;
      console.log(`[${pollerId}] Circuit breaker RESET after timeout`);
      return false;
    }

    return true;
  }

  private scheduleNextPoll(
    pollerId: string, 
    pollFn: () => Promise<void>, 
    config: PollingOptions
  ): void {
    const state = this.pollingStates.get(pollerId)!;
    
    const intervalId = setTimeout(async () => {
      this.activePollers.delete(pollerId);
      await pollFn();
    }, state.currentInterval) as unknown as number;

    this.activePollers.set(pollerId, intervalId);
  }
}

// Singleton instance
export const optimizedPollingService = OptimizedPollingService.getInstance();