import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOnboardingStore } from '@/store/onboardingStore';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Bot, 
  Sparkles, 
  FileText, 
  MessageSquare, 
  Calendar,
  BarChart,
  CheckCircle,
  ArrowRight,
  Zap,
  Target,
  Clock,
  Wand2
} from 'lucide-react';

interface AgentTemplate {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  capabilities: string[];
  useCase: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  color: string;
}

export const CreateAgentStep: React.FC = () => {
  const { 
    integrationStatus,
    updateIntegrationStatus, 
    completeStep,
    showAchievement 
  } = useOnboardingStore();

  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [agentName, setAgentName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showCustomization, setShowCustomization] = useState(false);

  const agentTemplates: AgentTemplate[] = [
    {
      id: 'content-analyzer',
      name: 'Content Analyzer',
      icon: <FileText className="w-6 h-6" />,
      description: 'Automatically categorizes and summarizes your documents and messages',
      capabilities: ['Text analysis', 'Auto-categorization', 'Content summarization', 'Keyword extraction'],
      useCase: 'Perfect for organizing large amounts of text content',
      difficulty: 'beginner',
      color: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30'
    },
    {
      id: 'chat-monitor',
      name: 'Chat Monitor',
      icon: <MessageSquare className="w-6 h-6" />,
      description: 'Monitors your chats for important information and action items',
      capabilities: ['Message monitoring', 'Action item detection', 'Priority alerts', 'Context analysis'],
      useCase: 'Great for staying on top of important conversations',
      difficulty: 'beginner',
      color: 'from-green-500/20 to-emerald-500/20 border-green-500/30'
    },
    {
      id: 'meeting-assistant',
      name: 'Meeting Assistant',
      icon: <Calendar className="w-6 h-6" />,
      description: 'Helps you prepare for meetings and tracks follow-up actions',
      capabilities: ['Meeting preparation', 'Action tracking', 'Reminder system', 'Note organization'],
      useCase: 'Essential for productive meeting management',
      difficulty: 'intermediate',
      color: 'from-purple-500/20 to-violet-500/20 border-purple-500/30'
    },
    {
      id: 'insight-generator',
      name: 'Insight Generator',
      icon: <BarChart className="w-6 h-6" />,
      description: 'Analyzes patterns in your data to generate actionable insights',
      capabilities: ['Pattern analysis', 'Trend detection', 'Report generation', 'Data visualization'],
      useCase: 'Perfect for data-driven decision making',
      difficulty: 'advanced',
      color: 'from-orange-500/20 to-red-500/20 border-orange-500/30'
    }
  ];

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = agentTemplates.find(t => t.id === templateId);
    if (template) {
      setAgentName(`My ${template.name}`);
      setShowCustomization(true);
    }
  };

  const handleCreateAgent = async () => {
    if (!selectedTemplate || !agentName.trim()) return;

    setIsCreating(true);

    // Simulate agent creation
    setTimeout(() => {
      updateIntegrationStatus('agents', {
        createdCount: integrationStatus.agents.createdCount + 1,
        activeCount: integrationStatus.agents.activeCount + 1,
        lastCreated: new Date()
      });

      showAchievement('🤖 Your first AI agent is ready!');
      completeStep('create-agent');
      setIsCreating(false);
    }, 2000);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-500/20 text-green-300';
      case 'intermediate': return 'bg-yellow-500/20 text-yellow-300';
      case 'advanced': return 'bg-red-500/20 text-red-300';
      default: return 'bg-gray-500/20 text-gray-300';
    }
  };

  const hasCreatedAgent = integrationStatus.agents.createdCount > 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div 
        className="text-center space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="text-6xl mb-4">🤖</div>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">
          Create Your AI Agent
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          AI agents work continuously in the background to analyze, organize, and 
          generate insights from your connected data sources.
        </p>
      </motion.div>

      {/* Progress Indicator */}
      {hasCreatedAgent && (
        <motion.div
          className="flex items-center justify-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Badge className="bg-green-500/20 text-green-300 px-4 py-2">
            <CheckCircle className="w-4 h-4 mr-2" />
            Agent created successfully!
          </Badge>
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {!showCustomization ? (
          /* Template Selection */
          <motion.div
            key="templates"
            className="space-y-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-center">
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Choose an Agent Template
              </h2>
              <p className="text-muted-foreground">
                Start with a pre-configured agent that matches your needs
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {agentTemplates.map((template, index) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 * index }}
                  whileHover={{ y: -5 }}
                >
                  <GlassCard 
                    className={`p-6 h-full cursor-pointer transition-all duration-300 hover:border-primary/50 bg-gradient-to-br ${template.color}`}
                    onClick={() => handleSelectTemplate(template.id)}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/10 rounded-lg">
                          {template.icon}
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{template.name}</h3>
                          <Badge className={getDifficultyColor(template.difficulty)}>
                            {template.difficulty}
                          </Badge>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground" />
                    </div>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                      {template.description}
                    </p>

                    {/* Use Case */}
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-primary" />
                        <span className="text-xs font-medium text-foreground">Use Case</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{template.useCase}</p>
                    </div>

                    {/* Capabilities */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-primary" />
                        <span className="text-xs font-medium text-foreground">Capabilities</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        {template.capabilities.slice(0, 4).map((capability, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <div className="w-1 h-1 bg-primary rounded-full" />
                            {capability}
                          </div>
                        ))}
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          /* Agent Customization */
          <motion.div
            key="customization"
            className="space-y-6 max-w-2xl mx-auto"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-center">
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Customize Your Agent
              </h2>
              <p className="text-muted-foreground">
                Give your agent a name and configure its behavior
              </p>
            </div>

            <GlassCard className="p-8">
              {/* Selected Template */}
              {selectedTemplate && (
                <div className="mb-6">
                  {(() => {
                    const template = agentTemplates.find(t => t.id === selectedTemplate);
                    return template ? (
                      <div className={`p-4 rounded-lg bg-gradient-to-br ${template.color} border`}>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-white/10 rounded-lg">
                            {template.icon}
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">{template.name}</h3>
                            <p className="text-sm text-muted-foreground">{template.description}</p>
                          </div>
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}

              {/* Agent Name */}
              <div className="space-y-3 mb-6">
                <Label htmlFor="agentName" className="text-sm font-medium text-foreground">
                  Agent Name
                </Label>
                <Input
                  id="agentName"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="Enter a name for your agent"
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Choose a name that helps you identify this agent's purpose
                </p>
              </div>

              {/* Quick Setup Info */}
              <div className="bg-muted/30 p-4 rounded-lg mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Quick Setup</span>
                </div>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    Pre-configured with optimal settings
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    Starts working immediately after creation
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    Can be customized further in settings
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowCustomization(false)}
                  disabled={isCreating}
                  className="flex-1"
                >
                  Back to Templates
                </Button>
                <Button
                  onClick={handleCreateAgent}
                  disabled={!agentName.trim() || isCreating}
                  className="flex-1 bg-primary hover:bg-primary/90"
                >
                  {isCreating ? (
                    <>
                      <Wand2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Agent...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Create Agent
                    </>
                  )}
                </Button>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Section */}
      <motion.div
        className="text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <GlassCard className="p-6 bg-muted/30">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-primary" />
            <span className="font-medium text-foreground">How Agents Work</span>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Once created, your agent will automatically process new content from your 
            connected sources. You can view its analysis and insights in your dashboard.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Bot className="w-3 h-3" />
              Always learning
            </div>
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Real-time processing
            </div>
            <div className="flex items-center gap-1">
              <BarChart className="w-3 h-3" />
              Actionable insights
            </div>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
};