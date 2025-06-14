import { AgentService } from '../agentService';
import { TwitterAgentExecutor } from './twitterAgent';
import { NewsAgentExecutor } from './newsAgent';
import { CrewAINewsAgentExecutor } from './crewaiAgent';

export function registerAgentExecutors(agentService: AgentService): void {
  console.log('[AgentRegistry] Registering agent executors...');

  // Register Twitter agent executor
  agentService.registerExecutor('twitter', new TwitterAgentExecutor());
  
  // Register News agent executor
  agentService.registerExecutor('news', new NewsAgentExecutor());
  
  // Register CrewAI multi-agent news executor
  agentService.registerExecutor('crewai_news', new CrewAINewsAgentExecutor());

  console.log('[AgentRegistry] Agent executors registered successfully');
}