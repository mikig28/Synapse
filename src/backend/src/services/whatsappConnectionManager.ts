import { EventEmitter } from 'events';

/**
 * Circuit Breaker pattern for WhatsApp connection management
 * Simplified connection logic with exponential backoff and state management
 */
export class WhatsAppConnectionManager extends EventEmitter {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;
  private nextAttemptTime = 0;
  
  // Configuration
  private readonly MAX_FAILURES = 5; // Reduced from 10
  private readonly FAILURE_THRESHOLD_MS = 60000; // 1 minute window
  private readonly BASE_DELAY = 2000; // 2 seconds
  private readonly MAX_DELAY = 60000; // 1 minute max
  private readonly HALF_OPEN_TIMEOUT = 30000; // 30 seconds

  constructor() {
    super();
  }

  /**
   * Check if connection attempt is allowed
   */
  canAttemptConnection(): boolean {
    const now = Date.now();

    switch (this.state) {
      case 'CLOSED':
        return true;

      case 'OPEN':
        // Circuit is open - check if enough time has passed
        if (now >= this.nextAttemptTime) {
          this.state = 'HALF_OPEN';
          console.log('[ConnectionManager] 🔄 Circuit entering HALF_OPEN state');
          return true;
        }
        return false;

      case 'HALF_OPEN':
        // Only one attempt allowed in half-open state
        return false;

      default:
        return false;
    }
  }

  /**
   * Record successful connection
   */
  onConnectionSuccess(): void {
    console.log('[ConnectionManager] ✅ Connection successful - resetting circuit');
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.nextAttemptTime = 0;
    this.emit('stateChange', { state: this.state, failureCount: this.failureCount });
  }

  /**
   * Record connection failure
   */
  onConnectionFailure(error: Error): void {
    const now = Date.now();
    this.lastFailureTime = now;
    this.failureCount++;

    console.log(`[ConnectionManager] ❌ Connection failure ${this.failureCount}/${this.MAX_FAILURES}: ${error.message}`);

    // Calculate next attempt time with exponential backoff
    const delay = this.calculateDelay();
    this.nextAttemptTime = now + delay;

    // Update circuit state
    if (this.failureCount >= this.MAX_FAILURES) {
      this.state = 'OPEN';
      console.log(`[ConnectionManager] 🔴 Circuit OPEN - next attempt in ${delay/1000}s`);
    } else if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      console.log('[ConnectionManager] 🔴 HALF_OPEN attempt failed - circuit OPEN');
    }

    this.emit('stateChange', { 
      state: this.state, 
      failureCount: this.failureCount,
      nextAttemptTime: this.nextAttemptTime,
      delay 
    });
  }

  /**
   * Calculate exponential backoff delay with jitter
   */
  private calculateDelay(): number {
    const exponentialDelay = Math.min(
      this.BASE_DELAY * Math.pow(2, this.failureCount - 1),
      this.MAX_DELAY
    );

    // Add jitter (±25% randomization)
    const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5);
    return Math.floor(exponentialDelay + jitter);
  }

  /**
   * Get current circuit state
   */
  getState(): {
    state: string;
    failureCount: number;
    lastFailureTime: number;
    nextAttemptTime: number;
    canAttempt: boolean;
    timeUntilNextAttempt: number;
  } {
    const now = Date.now();
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
      canAttempt: this.canAttemptConnection(),
      timeUntilNextAttempt: Math.max(0, this.nextAttemptTime - now)
    };
  }

  /**
   * Force reset the circuit (for manual interventions)
   */
  reset(): void {
    console.log('[ConnectionManager] 🔄 Manually resetting circuit breaker');
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.nextAttemptTime = 0;
    this.emit('stateChange', { state: this.state, failureCount: this.failureCount });
  }

  /**
   * Check if too many failures in recent time window
   */
  private isFailureThresholdExceeded(): boolean {
    const now = Date.now();
    return (now - this.lastFailureTime) < this.FAILURE_THRESHOLD_MS;
  }
}

/**
 * Error classification for different handling strategies
 */
export class WhatsAppErrorClassifier {
  static isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    
    // Retryable errors
    if (message.includes('timeout') ||
        message.includes('network') ||
        message.includes('connection lost') ||
        message.includes('socket')) {
      return true;
    }

    // Non-retryable errors
    if (message.includes('logged out') ||
        message.includes('unauthorized') ||
        message.includes('banned') ||
        message.includes('invalid session')) {
      return false;
    }

    // Default to retryable for unknown errors
    return true;
  }

  static getErrorType(error: Error): 'NETWORK' | 'AUTH' | 'CONFLICT' | 'TIMEOUT' | 'UNKNOWN' {
    const message = error.message.toLowerCase();

    if (message.includes('conflict') || message.includes('replaced')) {
      return 'CONFLICT';
    }
    if (message.includes('timeout') || message.includes('timed out')) {
      return 'TIMEOUT';
    }
    if (message.includes('logged out') || message.includes('unauthorized')) {
      return 'AUTH';
    }
    if (message.includes('network') || message.includes('connection')) {
      return 'NETWORK';
    }

    return 'UNKNOWN';
  }

  static shouldClearAuth(error: Error): boolean {
    const errorType = this.getErrorType(error);
    return errorType === 'AUTH' || errorType === 'CONFLICT';
  }
}

/**
 * Connection health monitor
 */
export class WhatsAppHealthMonitor extends EventEmitter {
  private lastPingTime = 0;
  private pingInterval: NodeJS.Timeout | null = null;
  private readonly PING_INTERVAL = 60000; // 1 minute
  private readonly PING_TIMEOUT = 10000; // 10 seconds

  start(): void {
    this.stop(); // Clear any existing interval
    
    console.log('[HealthMonitor] 🏥 Starting health monitoring');
    this.pingInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.PING_INTERVAL);
  }

  stop(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
      console.log('[HealthMonitor] 🏥 Health monitoring stopped');
    }
  }

  private async performHealthCheck(): Promise<void> {
    const now = Date.now();
    
    try {
      // Simple presence update as health check
      this.emit('healthCheck', { type: 'ping', timestamp: now });
      this.lastPingTime = now;
    } catch (error) {
      console.log('[HealthMonitor] ❌ Health check failed:', (error as Error).message);
      this.emit('healthFailure', { error, timestamp: now });
    }
  }

  getLastPingTime(): number {
    return this.lastPingTime;
  }

  isHealthy(): boolean {
    const now = Date.now();
    return (now - this.lastPingTime) < (this.PING_INTERVAL * 2); // Allow 2x interval
  }
}