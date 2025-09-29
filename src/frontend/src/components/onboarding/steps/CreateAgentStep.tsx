import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CheckCircle2,
  ClipboardList,
  FileText,
  Lightbulb,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useOnboardingStore } from '@/store/onboardingStore';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { agentService } from '@/services/agentService';

interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  summary: string;
  keywords: string[];
  suggestedPrompts: string[];
}

const templates: AgentTemplate[] = [
  {
    id: 'meeting-brief',
    name: 'Meeting brief bot',
    description: 'Summarises chats and documents and sends a brief before each meeting.',
    icon: <ClipboardList className="h-5 w-5" />,
    summary: 'Perfect when you juggle several stakeholders and need a quick rundown.',
    keywords: ['meeting', 'summary', 'action items'],
    suggestedPrompts: ['Summarise new notes tagged #meeting', 'Highlight open decisions for Friday sync'],
  },
  {
    id: 'deal-monitor',
    name: 'Pipeline monitor',
    description: 'Tracks WhatsApp or Telegram conversations for deal progress and flags risks.',
    icon: <FileText className="h-5 w-5" />,
    summary: 'Ideal for sales teams that rely on messaging channels.',
    keywords: ['deal', 'intent', 'follow up'],
    suggestedPrompts: ['Alert me if a prospect mentions budget', 'Summarise customer questions daily'],
  },
  {
    id: 'research-digest',
    name: 'Research digest',
    description: 'Collects documents and produces a digest with key quotes and next steps.',
    icon: <Lightbulb className="h-5 w-5" />,
    summary: 'Designed for researchers compiling large volumes of material.',
    keywords: ['research', 'digest', 'insights'],
    suggestedPrompts: ['Compile a weekly digest of new uploads', 'List unanswered questions from the latest papers'],
  },
];

export const CreateAgentStep: React.FC = () => {
  const { toast } = useToast();
  const {
    integrationStatus,
    updateIntegrationStatus,
    completeStep,
    showAchievement,
    skipStep,
  } = useOnboardingStore();

  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null);
  const [agentName, setAgentName] = useState('');
  const [agentDescription, setAgentDescription] = useState('');
  const [keywords, setKeywords] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasAgent = integrationStatus.agents.createdCount > 0;

  const handleTemplateSelect = (template: AgentTemplate) => {
    setSelectedTemplate(template);
    setAgentName(template.name);
    setAgentDescription(template.summary);
    setKeywords(template.keywords.join(', '));
    setErrorMessage(null);
  };

  const handleCreateAgent = async () => {
    if (!agentName.trim()) {
      setErrorMessage('Give your agent a descriptive name.');
      return;
    }

    setIsCreating(true);
    setErrorMessage(null);

    try {
      const configuration: any = {};
      if (keywords.trim()) {
        configuration.keywords = keywords
          .split(',')
          .map((keyword) => keyword.trim())
          .filter(Boolean);
      }

      const agent = await agentService.createAgent({
        name: agentName.trim(),
        type: 'custom',
        description: agentDescription.trim() || undefined,
        configuration,
      });

      updateIntegrationStatus('agents', {
        createdCount: integrationStatus.agents.createdCount + 1,
        activeCount: integrationStatus.agents.activeCount + (agent.isActive ? 1 : 0),
        lastCreated: agent.createdAt,
      });

      completeStep('create-agent');
      showAchievement('Your first automation is live. Check the agents page for activity.');
      toast({
        title: 'Agent created',
        description: `${agent.name} is ready. Trigger it now or schedule it from the agents page.`,
      });
    } catch (error: any) {
      console.error('Failed to create agent', error);
      const message = error?.response?.data?.message || error?.message || 'We could not create the agent.';
      setErrorMessage(message);
      toast({ variant: 'destructive', title: 'Agent creation failed', description: message });
    } finally {
      setIsCreating(false);
    }
  };

  const helperText = useMemo(() => {
    if (!selectedTemplate) {
      return 'Choose a starting point. You can always customise the agent later.';
    }
    return selectedTemplate.summary;
  }, [selectedTemplate]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Create an automation</h2>
          <p className="text-sm text-muted-foreground">
            Agents pull context from your connected sources and deliver organised updates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasAgent && <Badge variant="outline">Agents active</Badge>}
          <Button variant="ghost" onClick={skipStep} className="text-muted-foreground hover:text-foreground">
            Skip for now
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {templates.map((template) => (
          <motion.button
            key={template.id}
            onClick={() => handleTemplateSelect(template)}
            className={`text-left rounded-xl border p-5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
              selectedTemplate?.id === template.id
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/40'
            }`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-muted/60 p-3">{template.icon}</div>
              <div>
                <h3 className="text-base font-semibold text-foreground">{template.name}</h3>
                <p className="text-sm text-muted-foreground">{template.description}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {template.keywords.map((keyword) => (
                <Badge key={keyword} variant="secondary">
                  {keyword}
                </Badge>
              ))}
            </div>
          </motion.button>
        ))}
      </div>

      <GlassCard className="p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-primary/10 p-3 text-primary">
            <Bot className="h-5 w-5" />
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-foreground">Agent details</h3>
                {selectedTemplate && (
                  <Badge variant="outline" className="bg-primary/5">
                    Based on {selectedTemplate.name}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{helperText}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="agent-name">
                  Agent name
                </label>
                <Input
                  id="agent-name"
                  placeholder="Meeting recap assistant"
                  value={agentName}
                  onChange={(event) => setAgentName(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="agent-keywords">
                  Focus keywords
                </label>
                <Input
                  id="agent-keywords"
                  placeholder="meeting, action items, follow up"
                  value={keywords}
                  onChange={(event) => setKeywords(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Separate with commas. We use these to prioritise content.
                </p>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="agent-description">
                  Description
                </label>
                <Textarea
                  id="agent-description"
                  placeholder="Summarise meetings from uploaded docs and highlight follow-ups."
                  value={agentDescription}
                  onChange={(event) => setAgentDescription(event.target.value)}
                  rows={4}
                />
              </div>
            </div>

            {selectedTemplate && (
              <div className="rounded-md border border-muted bg-muted/40 p-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 text-foreground">
                  <Sparkles className="h-4 w-4" />
                  <span className="font-medium">Suggested prompts</span>
                </div>
                <ul className="mt-3 space-y-2">
                  {selectedTemplate.suggestedPrompts.map((prompt) => (
                    <li key={prompt} className="flex gap-2">
                      <ArrowRight className="mt-1 h-4 w-4 text-primary" />
                      <span>{prompt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleCreateAgent} disabled={isCreating || !selectedTemplate}>
                {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Create agent
              </Button>
              <Button variant="outline" onClick={() => setSelectedTemplate(null)} disabled={isCreating}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Choose another template
              </Button>
            </div>
          </div>
        </div>
      </GlassCard>

      {hasAgent && (
        <GlassCard className="p-6 bg-muted/40">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <span>
              You already have {integrationStatus.agents.createdCount} agent{integrationStatus.agents.createdCount > 1 ? 's' : ''}.
              Visit the agents page to schedule runs or add more automations.
            </span>
          </div>
        </GlassCard>
      )}
    </div>
  );
};

