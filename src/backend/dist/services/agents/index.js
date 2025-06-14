"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAgentExecutors = registerAgentExecutors;
const twitterAgent_1 = require("./twitterAgent");
const newsAgent_1 = require("./newsAgent");
function registerAgentExecutors(agentService) {
    console.log('[AgentRegistry] Registering agent executors...');
    // Register Twitter agent executor
    agentService.registerExecutor('twitter', new twitterAgent_1.TwitterAgentExecutor());
    // Register News agent executor
    agentService.registerExecutor('news', new newsAgent_1.NewsAgentExecutor());
    console.log('[AgentRegistry] Agent executors registered successfully');
}
