import { AgentService } from '../agentService';
import { TwitterAgentExecutor } from './twitterAgent';
import { NewsAgentExecutor } from './newsAgent';
import { CrewAINewsAgentExecutor } from './crewaiAgent';
import { CustomAgentExecutor } from './customAgent';

export function registerAgentExecutors(agentService: AgentService): void {
  console.log('[AgentRegistry] Registering agent executors...');

  // Register Twitter agent executor
  agentService.registerExecutor('twitter', new TwitterAgentExecutor());

  // Register News agent executor
  agentService.registerExecutor('news', new NewsAgentExecutor());

  // Register CrewAI multi-agent news executor
  agentService.registerExecutor('crewai_news', new CrewAINewsAgentExecutor());

  // Register Custom agent executor
  agentService.registerExecutor('custom', new CustomAgentExecutor());

  console.log('[AgentRegistry] Agent executors registered successfully');
  console.log('[AgentRegistry] Available executors:', ['twitter', 'news', 'crewai_news', 'custom']);
}