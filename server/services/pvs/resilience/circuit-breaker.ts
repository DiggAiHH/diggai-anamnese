// ============================================
// Circuit Breaker Pattern
// ============================================
// Verhindert Kaskadenfehler bei PVS-Ausfällen

import { EventEmitter } from 'events';
import { PvsError } from '../errors/pvs-error.js';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold: number;      // Anzahl Fehler vor Öffnung
  successThreshold: number;      // Anzahl Erfolge für Schließung
  timeoutMs: number;            // Zeit vor HALF_OPEN
  halfOpenMaxCalls: number;     // Max Calls im HALF_OPEN
}

export interface CircuitStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number | null;
  consecutiveSuccesses: number;
  totalCalls: number;
}

/**
 * Circuit Breaker für PVS-Verbindungen
 * Schützt vor Kaskadenfehlern bei PVS-Ausfällen
 */
export class CircuitBreaker extends EventEmitter {
  private state: CircuitState = 'CLOSED';
  private failures = 0;
  private successes = 0;
  private lastFailureTime: number | null = null;
  private consecutiveSuccesses = 0;
  private halfOpenCalls = 0;
  private totalCalls = 0;
  private resetTimer: NodeJS.Timeout | null = null;

  constructor(
    private name: string,
    private options: CircuitBreakerOptions = {
      failureThreshold: 5,
      successThreshold: 3,
      timeoutMs: 60000,
      halfOpenMaxCalls: 3,
    }
  ) {
    super();
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalCalls++;

    // Check if circuit is OPEN
    if (this.state === 'OPEN') {
      const timeSinceLastFailure = Date.now() - (this.lastFailureTime || 0);
      
      if (timeSinceLastFailure < this.options.timeoutMs) {
        throw new PvsError(
          'PVS_NET_4001_CONNECTION_TIMEOUT',
          `Circuit breaker for ${this.name} is OPEN`,
          { 
            details: { 
              retryAfter: this.options.timeoutMs - timeSinceLastFailure,
              state: this.state,
            },
            retryable: true,
          }
        );
      } else {
        // Transition to HALF_OPEN
        this.transitionTo('HALF_OPEN');
      }
    }

    // Limit calls in HALF_OPEN
    if (this.state === 'HALF_OPEN') {
      if (this.halfOpenCalls >= this.options.halfOpenMaxCalls) {
        throw new PvsError(
          'PVS_NET_4001_CONNECTION_TIMEOUT',
          `Circuit breaker for ${this.name} is HALF_OPEN and max calls reached`,
          { retryable: true }
        );
      }
      this.halfOpenCalls++;
    }

    // Execute the function
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful call
   */
  private onSuccess(): void {
    this.consecutiveSuccesses++;
    
    if (this.state === 'HALF_OPEN') {
      if (this.consecutiveSuccesses >= this.options.successThreshold) {
        this.transitionTo('CLOSED');
      }
    } else {
      this.failures = 0;
    }

    this.emit('success', { state: this.state, consecutiveSuccesses: this.consecutiveSuccesses });
  }

  /**
   * Handle failed call
   */
  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    this.consecutiveSuccesses = 0;

    if (this.state === 'HALF_OPEN') {
      // Immediately open on failure in half-open
      this.transitionTo('OPEN');
    } else if (this.state === 'CLOSED' && this.failures >= this.options.failureThreshold) {
      this.transitionTo('OPEN');
    }

    this.emit('failure', { state: this.state, failures: this.failures });
  }

  /**
   * Transition to new state
   */
  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;

    // Reset counters on state change
    if (newState === 'CLOSED') {
      this.failures = 0;
      this.halfOpenCalls = 0;
      this.consecutiveSuccesses = 0;
      if (this.resetTimer) {
        clearTimeout(this.resetTimer);
        this.resetTimer = null;
      }
    } else if (newState === 'OPEN') {
      this.halfOpenCalls = 0;
      this.consecutiveSuccesses = 0;
      
      // Schedule automatic transition to HALF_OPEN
      this.resetTimer = setTimeout(() => {
        this.transitionTo('HALF_OPEN');
      }, this.options.timeoutMs);
    } else if (newState === 'HALF_OPEN') {
      this.halfOpenCalls = 0;
      this.consecutiveSuccesses = 0;
    }

    this.emit('stateChange', { oldState, newState, name: this.name });
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get statistics
   */
  getStats(): CircuitStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      consecutiveSuccesses: this.consecutiveSuccesses,
      totalCalls: this.totalCalls,
    };
  }

  /**
   * Force circuit open (for maintenance)
   */
  forceOpen(): void {
    this.transitionTo('OPEN');
  }

  /**
   * Force circuit closed (recovery)
   */
  forceClose(): void {
    this.transitionTo('CLOSED');
  }

  /**
   * Check if circuit allows calls
   */
  canExecute(): boolean {
    if (this.state === 'CLOSED') return true;
    if (this.state === 'HALF_OPEN') return this.halfOpenCalls < this.options.halfOpenMaxCalls;
    
    // OPEN state - check timeout
    const timeSinceLastFailure = Date.now() - (this.lastFailureTime || 0);
    return timeSinceLastFailure >= this.options.timeoutMs;
  }
}

/**
 * Circuit Breaker Registry
 */
export class CircuitBreakerRegistry {
  private breakers = new Map<string, CircuitBreaker>();

  /**
   * Get or create circuit breaker
   */
  get(name: string, options?: CircuitBreakerOptions): CircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker(name, options));
    }
    return this.breakers.get(name)!;
  }

  /**
   * Remove circuit breaker
   */
  remove(name: string): void {
    this.breakers.delete(name);
  }

  /**
   * Get all stats
   */
  getAllStats(): Record<string, CircuitStats> {
    const stats: Record<string, CircuitStats> = {};
    for (const [name, breaker] of this.breakers) {
      stats[name] = breaker.getStats();
    }
    return stats;
  }

  /**
   * Reset all
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.forceClose();
    }
  }
}

// Export singleton
export const circuitBreakerRegistry = new CircuitBreakerRegistry();
