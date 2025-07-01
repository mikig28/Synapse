import { EventEmitter } from 'events';
import { 
  AGUIEvent, 
  IAGUIEmitter, 
  AGUIEventHandler, 
  AGUISubscription,
  SynapseAGUIEvent
} from '../types/aguiTypes';

/**
 * AG-UI Event Emitter Implementation
 * Provides standardized event emission following the AG-UI protocol
 */
export class AGUIEmitter extends EventEmitter implements IAGUIEmitter {
  private subscribers: Map<string, Set<AGUIEventHandler>> = new Map();
  private isEnabled: boolean = true;

  constructor() {
    super();
    this.setMaxListeners(100); // Allow many concurrent subscribers
  }

  /**
   * Emit an AG-UI event to all subscribers
   */
  emitEvent(event: AGUIEvent): void {
    if (!this.isEnabled) return;

    const enhancedEvent: AGUIEvent = {
      ...event,
      timestamp: event.timestamp || new Date().toISOString()
    };

    try {
      // Emit to EventEmitter listeners
      super.emit('ag-ui-event', enhancedEvent);
      super.emit(event.type, enhancedEvent);

      // Emit to manual subscribers
      const typeSubscribers = this.subscribers.get(event.type) || new Set();
      const wildcardSubscribers = this.subscribers.get('*') || new Set();

      [...typeSubscribers, ...wildcardSubscribers].forEach(handler => {
        try {
          handler(enhancedEvent);
        } catch (error) {
          console.error('[AGUIEmitter] Error in event handler:', error);
        }
      });

      console.log(`[AGUIEmitter] Emitted event: ${event.type}`, {
        type: event.type,
        timestamp: enhancedEvent.timestamp,
        hasMetadata: !!(enhancedEvent as SynapseAGUIEvent).metadata
      });
    } catch (error) {
      console.error('[AGUIEmitter] Error emitting event:', error);
    }
  }

  /**
   * Emit an AG-UI event to a specific user via Socket.IO
   */
  emitToUser(userId: string, event: AGUIEvent): void {
    if (!this.isEnabled) return;

    const enhancedEvent: AGUIEvent = {
      ...event,
      timestamp: event.timestamp || new Date().toISOString()
    };

    try {
      // Emit via Socket.IO to user's room
      if ((global as any).io) {
        (global as any).io.to(`user_${userId}`).emit('ag_ui_event', enhancedEvent);
      }

      // Also emit to general subscribers for logging/monitoring
      this.emitEvent(enhancedEvent);

      console.log(`[AGUIEmitter] Emitted event to user ${userId}: ${event.type}`);
    } catch (error) {
      console.error('[AGUIEmitter] Error emitting event to user:', error);
    }
  }

  /**
   * Emit an AG-UI event to a specific session
   */
  emitToSession(sessionId: string, event: AGUIEvent): void {
    if (!this.isEnabled) return;

    const enhancedEvent: AGUIEvent = {
      ...event,
      timestamp: event.timestamp || new Date().toISOString()
    };

    try {
      // Emit via Socket.IO to session room
      if ((global as any).io) {
        (global as any).io.to(`session_${sessionId}`).emit('ag_ui_event', enhancedEvent);
      }

      // Also emit to general subscribers
      this.emitEvent(enhancedEvent);

      console.log(`[AGUIEmitter] Emitted event to session ${sessionId}: ${event.type}`);
    } catch (error) {
      console.error('[AGUIEmitter] Error emitting event to session:', error);
    }
  }

  /**
   * Subscribe to AG-UI events
   */
  subscribe(handler: AGUIEventHandler): AGUISubscription {
    return this.subscribeToType('*', handler);
  }

  /**
   * Subscribe to specific event type
   */
  subscribeToType(eventType: string, handler: AGUIEventHandler): AGUISubscription {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }

    const typeSubscribers = this.subscribers.get(eventType)!;
    typeSubscribers.add(handler);

    console.log(`[AGUIEmitter] New subscriber for event type: ${eventType}`);

    return {
      unsubscribe: () => {
        typeSubscribers.delete(handler);
        if (typeSubscribers.size === 0) {
          this.subscribers.delete(eventType);
        }
        console.log(`[AGUIEmitter] Unsubscribed from event type: ${eventType}`);
      }
    };
  }

  /**
   * Get all active subscribers count
   */
  getSubscriberCount(): number {
    let count = 0;
    this.subscribers.forEach(handlers => {
      count += handlers.size;
    });
    return count;
  }

  /**
   * Get subscriber count by event type
   */
  getSubscriberCountByType(eventType: string): number {
    return this.subscribers.get(eventType)?.size || 0;
  }

  /**
   * Enable/disable event emission
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    console.log(`[AGUIEmitter] Event emission ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Clear all subscribers
   */
  clearSubscribers(): void {
    this.subscribers.clear();
    console.log('[AGUIEmitter] All subscribers cleared');
  }

  /**
   * Get event emission statistics
   */
  getStats(): {
    enabled: boolean;
    totalSubscribers: number;
    subscribersByType: Record<string, number>;
  } {
    const subscribersByType: Record<string, number> = {};
    this.subscribers.forEach((handlers, eventType) => {
      subscribersByType[eventType] = handlers.size;
    });

    return {
      enabled: this.isEnabled,
      totalSubscribers: this.getSubscriberCount(),
      subscribersByType
    };
  }
}

// Singleton instance
export const agui = new AGUIEmitter();

// Export convenience functions
export const emitAGUIEvent = (event: AGUIEvent) => agui.emitEvent(event);
export const emitToUser = (userId: string, event: AGUIEvent) => agui.emitToUser(userId, event);
export const emitToSession = (sessionId: string, event: AGUIEvent) => agui.emitToSession(sessionId, event);
export const subscribeToAGUI = (handler: AGUIEventHandler) => agui.subscribe(handler);
export const subscribeToAGUIType = (eventType: string, handler: AGUIEventHandler) => 
  agui.subscribeToType(eventType, handler);