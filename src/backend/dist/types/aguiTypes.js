"use strict";
// AG-UI Protocol Event Types and Interfaces
// Based on official AG-UI Protocol specification
Object.defineProperty(exports, "__esModule", { value: true });
exports.AGUIEventType = void 0;
// AG-UI Event Types enum
var AGUIEventType;
(function (AGUIEventType) {
    AGUIEventType["RUN_STARTED"] = "RUN_STARTED";
    AGUIEventType["RUN_FINISHED"] = "RUN_FINISHED";
    AGUIEventType["RUN_ERROR"] = "RUN_ERROR";
    AGUIEventType["STEP_STARTED"] = "STEP_STARTED";
    AGUIEventType["STEP_FINISHED"] = "STEP_FINISHED";
    AGUIEventType["TEXT_MESSAGE_START"] = "TEXT_MESSAGE_START";
    AGUIEventType["TEXT_MESSAGE_CONTENT"] = "TEXT_MESSAGE_CONTENT";
    AGUIEventType["TEXT_MESSAGE_END"] = "TEXT_MESSAGE_END";
    AGUIEventType["TOOL_CALL_START"] = "TOOL_CALL_START";
    AGUIEventType["TOOL_CALL_ARGS"] = "TOOL_CALL_ARGS";
    AGUIEventType["TOOL_CALL_END"] = "TOOL_CALL_END";
    AGUIEventType["TOOL_CALL_RESULT"] = "TOOL_CALL_RESULT";
    AGUIEventType["STATE_UPDATE"] = "STATE_UPDATE";
    AGUIEventType["CONTEXT_UPDATE"] = "CONTEXT_UPDATE";
    AGUIEventType["AGENT_COMMAND"] = "AGENT_COMMAND";
})(AGUIEventType || (exports.AGUIEventType = AGUIEventType = {}));
