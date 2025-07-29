import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { WizardData } from './AgentCreationWizard';
import {
  agentColors,
  typography,
  spacing,
  borderRadius,
  shadows
} from '@/utils/designSystem';
import {
  cardVariants,
  containerVariants,
  expandVariants
} from '@/utils/animations';
import {
  Settings,
  Twitter,
  Newspaper,
  Zap,
  Clock,
  Target,
  Filter,
  Globe,
  Sliders,
  Info,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface AgentConfigurationProps {
  data: WizardData;
  onUpdate: (updates: Partial<WizardData>) => void;
  onNext: () => void;
}

export const AgentConfiguration: React.FC<AgentConfigurationProps> = ({
  data,
  onUpdate,
}) => {
  const updateConfiguration = (updates: Partial<WizardData['configuration']>) => {
    onUpdate({
      configuration: {
        ...data.configuration,
        ...updates,
      },
    });
  };

  const getAgentIcon = () => {
    switch (data.type) {
      case 'twitter':
        return Twitter;
      case 'news':
        return Newspaper;
      case 'crewai_news':
        return Zap;
      default:
        return Settings;
    }
  };

  const getAgentDisplayName = () => {
    switch (data.type) {
      case 'twitter':
        return 'Twitter Agent';
      case 'news':
        return 'News Agent';
      case 'crewai_news':
        return 'CrewAI 2025 Multi-Agent';
      case 'custom':
        return 'Custom Agent';
      default:
        return 'Agent';
    }
  };

  const isFormValid = () => {
    return data.configuration.name.trim() !== '';
  };

  const IconComponent = getAgentIcon();

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Header Section */}
      <motion.div
        variants={cardVariants}
        className="text-center space-y-4"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="mx-auto w-16 h-16 rounded-full flex items-center justify-center"
          style={{
            backgroundColor: agentColors.running.bg,
            border: `2px solid ${agentColors.running.border}`
          }}
        >
          <Sliders className="w-8 h-8" style={{ color: agentColors.running.primary }} />
        </motion.div>
        
        <div>
          <h3 
            className="mb-2"
            style={{
              ...typography.heading,
              color: agentColors.running.text
            }}
          >
            Configure Your Agent
          </h3>
          <p 
            className="text-muted-foreground max-w-2xl mx-auto"
            style={{
              ...typography.body,
              color: agentColors.idle.text,
              opacity: 0.8
            }}
          >
            Customize your {getAgentDisplayName()} settings and parameters. 
            {data.template && ` Based on ${data.template.name} template.`}
          </p>
        </div>
      </motion.div>

      {/* Configuration Forms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Basic Configuration */}
        <motion.div variants={cardVariants} className="space-y-6">
          <Card 
            className="border-0"
            style={{
              backgroundColor: 'white',
              borderRadius: borderRadius.xl,
              boxShadow: shadows.md
            }}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" style={{ color: agentColors.running.primary }} />
                <span style={typography.cardTitle}>Basic Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Agent Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <span style={typography.small}>Agent Name</span>
                  <Badge variant="outline" className="text-xs">Required</Badge>
                </Label>
                <Input
                  id="name"
                  value={data.configuration.name}
                  onChange={(e) => updateConfiguration({ name: e.target.value })}
                  placeholder={`My ${getAgentDisplayName()}`}
                  className={`transition-all ${!isFormValid() ? 'border-red-300 focus:border-red-500' : ''}`}
                />
                {!data.configuration.name.trim() && (
                  <div className="flex items-center gap-2 text-red-500 text-xs">
                    <AlertCircle className="w-3 h-3" />
                    <span>Agent name is required</span>
                  </div>
                )}
              </div>

              {/* Agent Description */}
              <div className="space-y-2">
                <Label htmlFor="description">
                  <span style={typography.small}>Description</span>
                </Label>
                <Textarea
                  id="description"
                  value={data.configuration.description}
                  onChange={(e) => updateConfiguration({ description: e.target.value })}
                  placeholder="Describe what this agent will do..."
                  rows={3}
                />
              </div>

              {/* Schedule */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="w-4 h-4" style={{ color: agentColors.running.primary }} />
                  <span style={typography.small}>Run Schedule (Cron)</span>
                </Label>
                <Input
                  value={data.configuration.schedule}
                  onChange={(e) => updateConfiguration({ schedule: e.target.value })}
                  placeholder="0 */6 * * *"
                />
                <div className="text-xs text-muted-foreground">
                  <Info className="w-3 h-3 inline mr-1" />
                  Current: Every 6 hours. Use cron format for custom schedules.
                </div>
              </div>

              {/* Max Items */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Target className="w-4 h-4" style={{ color: agentColors.running.primary }} />
                  <span style={typography.small}>Max Items Per Run</span>
                </Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={data.configuration.maxItemsPerRun}
                  onChange={(e) => updateConfiguration({ maxItemsPerRun: parseInt(e.target.value) || 10 })}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Type-Specific Configuration */}
        <motion.div variants={cardVariants} className="space-y-6">
          <Card 
            className="border-0"
            style={{
              backgroundColor: 'white',
              borderRadius: borderRadius.xl,
              boxShadow: shadows.md
            }}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IconComponent className="w-5 h-5" style={{ color: agentColors.running.primary }} />
                <span style={typography.cardTitle}>{getAgentDisplayName()} Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Twitter-specific settings */}
              {data.type === 'twitter' && (
                <>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Filter className="w-4 h-4" style={{ color: agentColors.running.primary }} />
                      <span style={typography.small}>Keywords (comma-separated)</span>
                    </Label>
                    <Input
                      value={data.configuration.keywords}
                      onChange={(e) => updateConfiguration({ keywords: e.target.value })}
                      placeholder="AI, technology, startup, innovation"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label style={typography.small}>Minimum Likes</Label>
                      <Input
                        type="number"
                        min="0"
                        value={data.configuration.minLikes}
                        onChange={(e) => updateConfiguration({ minLikes: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label style={typography.small}>Minimum Retweets</Label>
                      <Input
                        type="number"
                        min="0"
                        value={data.configuration.minRetweets}
                        onChange={(e) => updateConfiguration({ minRetweets: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <span style={typography.small}>Exclude Replies</span>
                    </Label>
                    <Switch
                      checked={data.configuration.excludeReplies}
                      onCheckedChange={(checked) => updateConfiguration({ excludeReplies: checked })}
                    />
                  </div>
                </>
              )}

              {/* News-specific settings */}
              {data.type === 'news' && (
                <>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Filter className="w-4 h-4" style={{ color: agentColors.running.primary }} />
                      <span style={typography.small}>Categories (comma-separated)</span>
                    </Label>
                    <Input
                      value={data.configuration.categories}
                      onChange={(e) => updateConfiguration({ categories: e.target.value })}
                      placeholder="technology, business, science"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Globe className="w-4 h-4" style={{ color: agentColors.running.primary }} />
                      <span style={typography.small}>Language</span>
                    </Label>
                    <Select 
                      value={data.configuration.language} 
                      onValueChange={(value) => updateConfiguration({ language: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                        <SelectItem value="zh">Chinese</SelectItem>
                        <SelectItem value="ja">Japanese</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label style={typography.small}>News Sources (optional)</Label>
                    <Input
                      value={data.configuration.newsSources}
                      onChange={(e) => updateConfiguration({ newsSources: e.target.value })}
                      placeholder="techcrunch.com, reuters.com"
                    />
                  </div>
                </>
              )}

              {/* CrewAI-specific settings */}
              {data.type === 'crewai_news' && (
                <>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Target className="w-4 h-4" style={{ color: agentColors.running.primary }} />
                      <span style={typography.small}>Research Topics (comma-separated)</span>
                    </Label>
                    <Input
                      value={data.configuration.topics}
                      onChange={(e) => updateConfiguration({ topics: e.target.value })}
                      placeholder="artificial intelligence, business strategy, market trends"
                    />
                    <div className="text-xs text-muted-foreground">
                      <Info className="w-3 h-3 inline mr-1" />
                      Works with ANY topics - sports, finance, technology, lifestyle, etc.
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      <Globe className="w-4 h-4" style={{ color: agentColors.running.primary }} />
                      <span style={typography.small}>Content Sources</span>
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(data.configuration.crewaiSources).map(([source, enabled]) => (
                        <div key={source} className="flex items-center justify-between">
                          <Label htmlFor={source} className="capitalize text-sm">
                            {source.replace('_', ' ')}
                          </Label>
                          <Switch
                            id={source}
                            checked={enabled}
                            onCheckedChange={(checked) =>
                              updateConfiguration({
                                crewaiSources: {
                                  ...data.configuration.crewaiSources,
                                  [source]: checked,
                                },
                              })
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Custom agent settings */}
              {data.type === 'custom' && (
                <>
                  <div className="space-y-2">
                    <Label style={typography.small}>Keywords (comma-separated)</Label>
                    <Input
                      value={data.configuration.keywords}
                      onChange={(e) => updateConfiguration({ keywords: e.target.value })}
                      placeholder="Enter keywords..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label style={typography.small}>Categories (comma-separated)</Label>
                    <Input
                      value={data.configuration.categories}
                      onChange={(e) => updateConfiguration({ categories: e.target.value })}
                      placeholder="Enter categories..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label style={typography.small}>Topics (comma-separated)</Label>
                    <Input
                      value={data.configuration.topics}
                      onChange={(e) => updateConfiguration({ topics: e.target.value })}
                      placeholder="Enter topics..."
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Validation Status */}
      <motion.div
        variants={cardVariants}
        className="text-center"
      >
        {isFormValid() ? (
          <div 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm"
            style={{
              backgroundColor: agentColors.completed.bg,
              color: agentColors.completed.text,
              border: `1px solid ${agentColors.completed.border}`
            }}
          >
            <CheckCircle className="w-4 h-4" />
            Configuration is valid - ready to proceed!
          </div>
        ) : (
          <div 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm"
            style={{
              backgroundColor: agentColors.error.bg,
              color: agentColors.error.text,
              border: `1px solid ${agentColors.error.border}`
            }}
          >
            <AlertCircle className="w-4 h-4" />
            Please provide a name for your agent
          </div>
        )}
      </motion.div>

      {/* Help Text */}
      <motion.div
        variants={cardVariants}
        className="text-center p-4 rounded-xl"
        style={{
          backgroundColor: agentColors.idle.bg,
          border: `1px solid ${agentColors.idle.border}`
        }}
      >
        <p 
          className="text-sm"
          style={{
            color: agentColors.idle.text,
            opacity: 0.8
          }}
        >
          💡 <strong>Pro tip:</strong> You can always modify these settings later from the agent's settings page. 
          Start with broader parameters and refine based on results.
        </p>
      </motion.div>
    </motion.div>
  );
};