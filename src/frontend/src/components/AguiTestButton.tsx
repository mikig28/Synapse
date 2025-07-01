import React from 'react';
import { Button } from '@/components/ui/button';
import { useAgui } from '../contexts/AguiContext';
import { AGUIEventType } from '../types/aguiTypes';
import { Zap } from 'lucide-react';

export const AguiTestButton: React.FC = () => {
  const { emit, isConnected } = useAgui();

  const sendTestEvent = () => {
    if (!isConnected) {
      console.warn('AG-UI not connected');
      return;
    }

    // Send a test run started event
    const runId = `test_run_${Date.now()}`;
    const agentId = 'test_agent_123';
    
    console.log('Sending test AG-UI events...');

    // Simulate a run starting
    emit({
      type: AGUIEventType.RUN_STARTED,
      runId,
      timestamp: new Date().toISOString(),
      rawEvent: { agentId, agentName: 'Test Agent' }
    } as any);

    // Simulate some steps
    setTimeout(() => {
      emit({
        type: AGUIEventType.STEP_STARTED,
        stepId: 'step_1',
        stepName: 'Collecting Data',
        timestamp: new Date().toISOString(),
        rawEvent: { agentId, description: 'Gathering information from sources' }
      } as any);
    }, 1000);

    setTimeout(() => {
      emit({
        type: AGUIEventType.TEXT_MESSAGE_START,
        messageId: 'msg_1',
        role: 'assistant',
        timestamp: new Date().toISOString(),
        rawEvent: { agentId }
      } as any);

      emit({
        type: AGUIEventType.TEXT_MESSAGE_CONTENT,
        messageId: 'msg_1',
        delta: 'Processing data from multiple sources...',
        timestamp: new Date().toISOString(),
        rawEvent: { agentId }
      } as any);

      emit({
        type: AGUIEventType.TEXT_MESSAGE_END,
        messageId: 'msg_1',
        timestamp: new Date().toISOString(),
        rawEvent: { agentId }
      } as any);
    }, 1500);

    setTimeout(() => {
      emit({
        type: AGUIEventType.STEP_FINISHED,
        stepId: 'step_1',
        stepName: 'Collecting Data',
        timestamp: new Date().toISOString(),
        rawEvent: { agentId }
      } as any);
    }, 2000);

    setTimeout(() => {
      emit({
        type: AGUIEventType.STEP_STARTED,
        stepId: 'step_2',
        stepName: 'Analyzing Content',
        timestamp: new Date().toISOString(),
        rawEvent: { agentId, description: 'Applying AI analysis to collected data' }
      } as any);
    }, 2500);

    setTimeout(() => {
      emit({
        type: AGUIEventType.STATE_UPDATE,
        key: 'progress',
        value: 75,
        timestamp: new Date().toISOString(),
        rawEvent: { agentId }
      } as any);
    }, 3000);

    setTimeout(() => {
      emit({
        type: AGUIEventType.STEP_FINISHED,
        stepId: 'step_2',
        stepName: 'Analyzing Content',
        timestamp: new Date().toISOString(),
        rawEvent: { agentId }
      } as any);
    }, 3500);

    setTimeout(() => {
      emit({
        type: AGUIEventType.RUN_FINISHED,
        runId,
        timestamp: new Date().toISOString(),
        rawEvent: { agentId, results: { itemsProcessed: 10, itemsAdded: 5 } }
      } as any);
    }, 4000);
  };

  return (
    <Button
      onClick={sendTestEvent}
      disabled={!isConnected}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      <Zap className="w-4 h-4" />
      Send Test AG-UI Events
    </Button>
  );
}; 