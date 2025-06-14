import { AgentService } from '../agentService';
import { TwitterAgentExecutor } from './twitterAgent';
import { NewsAgentExecutor } from './newsAgent';

export function registerAgentExecutors(agentService: AgentService): void {
  console.log('[AgentRegistry] Registering agent executors...');

  // Register Twitter agent executor
  agentService.registerExecutor('twitter', new TwitterAgentExecutor());
  
  // Register News agent executor
  agentService.registerExecutor('news', new NewsAgentExecutor());

  console.log('[AgentRegistry] Agent executors registered successfully');
}