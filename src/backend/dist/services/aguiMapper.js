"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapAgentStatusToAGUIEvents = mapAgentStatusToAGUIEvents;
exports.mapCrewProgressToAGUIEvents = mapCrewProgressToAGUIEvents;
exports.mapAgentLogToAGUIEvents = mapAgentLogToAGUIEvents;
exports.mapAgentStatsToAGUIEvent = mapAgentStatsToAGUIEvent;
exports.createAgentCommandEvent = createAgentCommandEvent;
exports.generateAGUIId = generateAGUIId;
exports.validateAGUIEvent = validateAGUIEvent;
const aguiTypes_1 = require("../types/aguiTypes");
/**
 * Map agent status update to AG-UI Run events
 */
function mapAgentStatusToAGUIEvents(userId, agentId, agentName, agentType, updateData) {
    const events = [];
    const threadId = `agent_${agentId}`;
    const runId = updateData.runId || `run_${Date.now()}`;
    switch (updateData.status) {
        case 'running':
            events.push({
                type: aguiTypes_1.AGUIEventType.RUN_STARTED,
                threadId,
                runId,
                timestamp: updateData.timestamp.toISOString()
            });
            // If there's a message, emit it as a text message
            if (updateData.message) {
                const messageId = `msg_${Date.now()}`;
                events.push({
                    type: aguiTypes_1.AGUIEventType.TEXT_MESSAGE_START,
                    messageId,
                    role: 'assistant',
                    timestamp: updateData.timestamp.toISOString()
                });
                events.push({
                    type: aguiTypes_1.AGUIEventType.TEXT_MESSAGE_CONTENT,
                    messageId,
                    delta: updateData.message,
                    timestamp: updateData.timestamp.toISOString()
                });
                events.push({
                    type: aguiTypes_1.AGUIEventType.TEXT_MESSAGE_END,
                    messageId,
                    timestamp: updateData.timestamp.toISOString()
                });
            }
            break;
        case 'completed':
            events.push({
                type: aguiTypes_1.AGUIEventType.RUN_FINISHED,
                threadId,
                runId,
                timestamp: updateData.timestamp.toISOString()
            });
            // Emit completion message
            if (updateData.message) {
                const messageId = `msg_${Date.now()}`;
                events.push({
                    type: aguiTypes_1.AGUIEventType.TEXT_MESSAGE_START,
                    messageId,
                    role: 'assistant',
                    timestamp: updateData.timestamp.toISOString()
                });
                events.push({
                    type: aguiTypes_1.AGUIEventType.TEXT_MESSAGE_CONTENT,
                    messageId,
                    delta: updateData.message,
                    timestamp: updateData.timestamp.toISOString()
                });
                events.push({
                    type: aguiTypes_1.AGUIEventType.TEXT_MESSAGE_END,
                    messageId,
                    timestamp: updateData.timestamp.toISOString()
                });
            }
            break;
        case 'failed':
            events.push({
                type: aguiTypes_1.AGUIEventType.RUN_ERROR,
                message: updateData.error || updateData.message || 'Agent execution failed',
                code: 'AGENT_EXECUTION_ERROR',
                timestamp: updateData.timestamp.toISOString()
            });
            break;
        case 'paused':
            events.push({
                type: aguiTypes_1.AGUIEventType.STATE_UPDATE,
                key: 'agent_status',
                value: 'paused',
                timestamp: updateData.timestamp.toISOString()
            });
            break;
        case 'resumed':
            events.push({
                type: aguiTypes_1.AGUIEventType.STATE_UPDATE,
                key: 'agent_status',
                value: 'running',
                timestamp: updateData.timestamp.toISOString()
            });
            break;
    }
    return events;
}
/**
 * Map CrewAI progress data to AG-UI Step events
 */
function mapCrewProgressToAGUIEvents(userId, agentId, agentName, progressData) {
    const events = [];
    // Map each step to AG-UI step events
    if (progressData.steps && progressData.steps.length > 0) {
        for (const step of progressData.steps) {
            const stepId = `${step.agent}_${step.step}_${Date.parse(step.timestamp)}`;
            if (step.status === 'running' || step.status === 'started') {
                events.push({
                    type: aguiTypes_1.AGUIEventType.STEP_STARTED,
                    stepName: `${step.agent}: ${step.step}`,
                    stepId,
                    timestamp: step.timestamp
                });
                // Emit step message if available
                if (step.message && step.message !== step.step) {
                    const messageId = `msg_${stepId}`;
                    events.push({
                        type: aguiTypes_1.AGUIEventType.TEXT_MESSAGE_START,
                        messageId,
                        role: 'assistant',
                        timestamp: step.timestamp
                    });
                    events.push({
                        type: aguiTypes_1.AGUIEventType.TEXT_MESSAGE_CONTENT,
                        messageId,
                        delta: step.message,
                        timestamp: step.timestamp
                    });
                    events.push({
                        type: aguiTypes_1.AGUIEventType.TEXT_MESSAGE_END,
                        messageId,
                        timestamp: step.timestamp
                    });
                }
            }
            else if (step.status === 'completed' || step.status === 'finished') {
                events.push({
                    type: aguiTypes_1.AGUIEventType.STEP_FINISHED,
                    stepName: `${step.agent}: ${step.step}`,
                    stepId,
                    timestamp: step.timestamp
                });
            }
        }
    }
    // If there are results, emit state update
    if (progressData.results) {
        events.push({
            type: aguiTypes_1.AGUIEventType.STATE_UPDATE,
            key: 'crew_results',
            value: progressData.results,
            timestamp: new Date().toISOString()
        });
    }
    return events;
}
/**
 * Map agent log entry to AG-UI Text Message events
 */
function mapAgentLogToAGUIEvents(userId, agentId, agentName, logLevel, logMessage, logData) {
    const events = [];
    const messageId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();
    // Only emit significant log messages as text messages
    if (logLevel === 'info' || logLevel === 'error' || logLevel === 'warn') {
        events.push({
            type: aguiTypes_1.AGUIEventType.TEXT_MESSAGE_START,
            messageId,
            role: 'system',
            timestamp
        });
        events.push({
            type: aguiTypes_1.AGUIEventType.TEXT_MESSAGE_CONTENT,
            messageId,
            delta: `[${logLevel.toUpperCase()}] ${logMessage}`,
            timestamp
        });
        events.push({
            type: aguiTypes_1.AGUIEventType.TEXT_MESSAGE_END,
            messageId,
            timestamp
        });
    }
    return events;
}
/**
 * Map agent statistics to AG-UI State Update event
 */
function mapAgentStatsToAGUIEvent(userId, agentId, agentName, stats) {
    return {
        type: aguiTypes_1.AGUIEventType.STATE_UPDATE,
        key: 'agent_statistics',
        value: stats,
        timestamp: new Date().toISOString()
    };
}
/**
 * Create AG-UI command event for agent control
 */
function createAgentCommandEvent(command, agentId, userId) {
    return {
        type: aguiTypes_1.AGUIEventType.AGENT_COMMAND,
        command,
        agentId,
        userId,
        timestamp: new Date().toISOString()
    };
}
/**
 * Utility function to create unique IDs
 */
function generateAGUIId(prefix = 'ag') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
/**
 * Validate AG-UI event structure
 */
function validateAGUIEvent(event) {
    return (event &&
        typeof event === 'object' &&
        typeof event.type === 'string' &&
        Object.values(aguiTypes_1.AGUIEventType).includes(event.type));
}
