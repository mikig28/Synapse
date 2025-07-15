"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscribeToAGUIType = exports.subscribeToAGUI = exports.emitToSession = exports.emitToUser = exports.emitAGUIEvent = exports.agui = exports.AGUIEmitter = void 0;
const events_1 = require("events");
/**
 * AG-UI Event Emitter Implementation
 * Provides standardized event emission following the AG-UI protocol
 */
class AGUIEmitter extends events_1.EventEmitter {
    constructor() {
        super();
        this.subscribers = new Map();
        this.isEnabled = true;
        this.setMaxListeners(100); // Allow many concurrent subscribers
    }
    /**
     * Emit an AG-UI event to all subscribers
     */
    emitEvent(event) {
        if (!this.isEnabled)
            return;
        const enhancedEvent = {
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
                }
                catch (error) {
                    console.error('[AGUIEmitter] Error in event handler:', error);
                }
            });
            console.log(`[AGUIEmitter] Emitted event: ${event.type}`, {
                type: event.type,
                timestamp: enhancedEvent.timestamp,
                hasMetadata: !!enhancedEvent.metadata
            });
        }
        catch (error) {
            console.error('[AGUIEmitter] Error emitting event:', error);
        }
    }
    /**
     * Emit an AG-UI event to a specific user via Socket.IO
     */
    emitToUser(userId, event) {
        if (!this.isEnabled)
            return;
        const enhancedEvent = {
            ...event,
            timestamp: event.timestamp || new Date().toISOString()
        };
        try {
            // Emit via Socket.IO to user's room
            if (global.io) {
                global.io.to(`user_${userId}`).emit('ag_ui_event', enhancedEvent);
            }
            // Also emit to general subscribers for logging/monitoring
            this.emitEvent(enhancedEvent);
            console.log(`[AGUIEmitter] Emitted event to user ${userId}: ${event.type}`);
        }
        catch (error) {
            console.error('[AGUIEmitter] Error emitting event to user:', error);
        }
    }
    /**
     * Emit an AG-UI event to a specific session
     */
    emitToSession(sessionId, event) {
        if (!this.isEnabled)
            return;
        const enhancedEvent = {
            ...event,
            timestamp: event.timestamp || new Date().toISOString()
        };
        try {
            // Emit via Socket.IO to session room
            if (global.io) {
                global.io.to(`session_${sessionId}`).emit('ag_ui_event', enhancedEvent);
            }
            // Also emit to general subscribers
            this.emitEvent(enhancedEvent);
            console.log(`[AGUIEmitter] Emitted event to session ${sessionId}: ${event.type}`);
        }
        catch (error) {
            console.error('[AGUIEmitter] Error emitting event to session:', error);
        }
    }
    /**
     * Subscribe to AG-UI events
     */
    subscribe(handler) {
        return this.subscribeToType('*', handler);
    }
    /**
     * Subscribe to specific event type
     */
    subscribeToType(eventType, handler) {
        if (!this.subscribers.has(eventType)) {
            this.subscribers.set(eventType, new Set());
        }
        const typeSubscribers = this.subscribers.get(eventType);
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
    getSubscriberCount() {
        let count = 0;
        this.subscribers.forEach(handlers => {
            count += handlers.size;
        });
        return count;
    }
    /**
     * Get subscriber count by event type
     */
    getSubscriberCountByType(eventType) {
        return this.subscribers.get(eventType)?.size || 0;
    }
    /**
     * Enable/disable event emission
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        console.log(`[AGUIEmitter] Event emission ${enabled ? 'enabled' : 'disabled'}`);
    }
    /**
     * Clear all subscribers
     */
    clearSubscribers() {
        this.subscribers.clear();
        console.log('[AGUIEmitter] All subscribers cleared');
    }
    /**
     * Get event emission statistics
     */
    getStats() {
        const subscribersByType = {};
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
exports.AGUIEmitter = AGUIEmitter;
// Singleton instance
exports.agui = new AGUIEmitter();
// Export convenience functions
const emitAGUIEvent = (event) => exports.agui.emitEvent(event);
exports.emitAGUIEvent = emitAGUIEvent;
const emitToUser = (userId, event) => exports.agui.emitToUser(userId, event);
exports.emitToUser = emitToUser;
const emitToSession = (sessionId, event) => exports.agui.emitToSession(sessionId, event);
exports.emitToSession = emitToSession;
const subscribeToAGUI = (handler) => exports.agui.subscribe(handler);
exports.subscribeToAGUI = subscribeToAGUI;
const subscribeToAGUIType = (eventType, handler) => exports.agui.subscribeToType(eventType, handler);
exports.subscribeToAGUIType = subscribeToAGUIType;
