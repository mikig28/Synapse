import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { WizardData } from './AgentCreationWizard';
import {
  agentColors,
  typography,
  spacing,
  borderRadius,
  shadows,
  getAgentTypeColor
} from '@/utils/designSystem';
import {
  cardVariants,
  containerVariants,
  statusVariants
} from '@/utils/animations';
import {
  CheckCircle,
  Clock,
  Target,
  Settings,
  Twitter,
  Newspaper,
  Zap,
  Play,
  Calendar,
  Filter,
  Globe,
  Users,
  Sparkles,
  Info,
  Rocket
} from 'lucide-react';

interface ReviewAndLaunchProps {
  data: WizardData;
  onUpdate: (updates: Partial<WizardData>) => void;
  onNext: () => void;
}

export const ReviewAndLaunch: React.FC<ReviewAndLaunchProps> = ({
  data,
}) => {
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

  const getScheduleDescription = (cron: string) => {
    const scheduleMap: Record<string, string> = {
      '*/30 * * * *': 'Every 30 minutes',
      '0 * * * *': 'Every hour',
      '0 */2 * * *': 'Every 2 hours',
      '0 */4 * * *': 'Every 4 hours',
      '0 */6 * * *': 'Every 6 hours',
      '0 */12 * * *': 'Every 12 hours',
      '0 9 * * *': 'Daily at 9:00 AM',
      '0 8,14,20 * * *': '3 times daily (8 AM, 2 PM, 8 PM)',
      '0 9,17 * * *': 'Twice daily (9 AM, 5 PM)',
    };
    
    return scheduleMap[cron] || `Custom schedule: ${cron}`;
  };

  const getExpectedBehavior = () => {
    if (!data.type || !data.template) return [];
    
    const behaviors = [];
    
    switch (data.type) {
      case 'twitter':
        behaviors.push('Monitor Twitter for tweets matching your keywords');
        behaviors.push(`Filter tweets with at least ${data.configuration.minLikes} likes and ${data.configuration.minRetweets} retweets`);
        if (data.configuration.excludeReplies) {
          behaviors.push('Exclude reply tweets to focus on original content');
        }
        behaviors.push('Analyze sentiment and engagement metrics');
        break;
      
      case 'news':
        behaviors.push('Aggregate news articles from multiple sources');
        behaviors.push(`Filter content in ${data.configuration.language} language`);
        if (data.configuration.categories) {
          behaviors.push(`Focus on categories: ${data.configuration.categories}`);
        }
        behaviors.push('Score articles for quality and relevance');
        break;
      
      case 'crewai_news':
        behaviors.push('Deploy multiple AI agents for comprehensive research');
        const enabledSources = Object.entries(data.configuration.crewaiSources)
          .filter(([_, enabled]) => enabled)
          .map(([source, _]) => source.replace('_', ' '))
          .join(', ');
        if (enabledSources) {
          behaviors.push(`Search across: ${enabledSources}`);
        }
        behaviors.push('Cross-reference findings for accuracy');
        behaviors.push('Generate intelligent summaries and insights');
        break;
      
      case 'custom':
        behaviors.push('Execute custom monitoring logic');
        if (data.configuration.keywords) {
          behaviors.push(`Track keywords: ${data.configuration.keywords}`);
        }
        if (data.configuration.topics) {
          behaviors.push(`Research topics: ${data.configuration.topics}`);
        }
        break;
    }
    
    behaviors.push(`Collect up to ${data.configuration.maxItemsPerRun} items per run`);
    behaviors.push(`Run automatically: ${getScheduleDescription(data.configuration.schedule)}`);
    
    return behaviors;
  };

  const IconComponent = getAgentIcon();
  const typeColor = data.type ? getAgentTypeColor(data.type) : agentColors.idle;
  const expectedBehaviors = getExpectedBehavior();

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
            backgroundColor: agentColors.completed.bg,
            border: `2px solid ${agentColors.completed.border}`
          }}
        >
          <Rocket className="w-8 h-8" style={{ color: agentColors.completed.primary }} />
        </motion.div>
        
        <div>
          <h3 
            className="mb-2"
            style={{
              ...typography.heading,
              color: agentColors.running.text
            }}
          >
            Review & Launch
          </h3>
          <p 
            className="text-muted-foreground max-w-2xl mx-auto"
            style={{
              ...typography.body,
              color: agentColors.idle.text,
              opacity: 0.8
            }}
          >
            Review your agent configuration and launch it to start automated content curation.
          </p>
        </div>
      </motion.div>

      {/* Agent Summary Card */}
      <motion.div variants={cardVariants}>
        <Card 
          className="border-0 overflow-hidden"
          style={{
            backgroundColor: 'white',
            borderRadius: borderRadius.xl,
            boxShadow: shadows.lg,
            border: `2px solid ${typeColor.border}`
          }}
        >
          <CardHeader 
            className="relative"
            style={{
              background: `linear-gradient(135deg, ${typeColor.bg}, ${typeColor.bgDark})`,
              borderBottom: `1px solid ${typeColor.border}`
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <motion.div
                  variants={statusVariants.completed}
                  animate="completed"
                  className="p-3 rounded-xl"
                  style={{
                    backgroundColor: typeColor.primary,
                    color: 'white'
                  }}
                >
                  <IconComponent className="w-6 h-6" />
                </motion.div>
                
                <div>
                  <CardTitle className="flex items-center gap-2 mb-1">
                    <span style={{ ...typography.heading, color: typeColor.primary }}>
                      {data.configuration.name || 'Unnamed Agent'}
                    </span>
                    {data.template?.isRecommended && (
                      <Badge 
                        className="px-2 py-0.5 text-xs border-0 flex items-center gap-1"
                        style={{
                          backgroundColor: agentColors.running.primary,
                          color: 'white'
                        }}
                      >
                        <Sparkles className="w-3 h-3" />
                        RECOMMENDED
                      </Badge>
                    )}
                  </CardTitle>
                  
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline"
                      style={{
                        borderColor: typeColor.border,
                        color: typeColor.primary,
                        backgroundColor: typeColor.bg
                      }}
                    >
                      {getAgentDisplayName()}
                    </Badge>
                    
                    {data.template && (
                      <Badge 
                        variant="outline"
                        style={{
                          borderColor: agentColors.idle.border,
                          color: agentColors.idle.text,
                          backgroundColor: agentColors.idle.bg
                        }}
                      >
                        {data.template.name} Template
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: 'spring' }}
                className="p-2 rounded-full"
                style={{ backgroundColor: agentColors.completed.primary }}
              >
                <CheckCircle className="w-6 h-6 text-white" />
              </motion.div>
            </div>

            {data.configuration.description && (
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-3 text-sm"
                style={{ color: typeColor.text, opacity: 0.8 }}
              >
                {data.configuration.description}
              </motion.p>
            )}
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Configuration Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <motion.div
                variants={cardVariants}
                className="flex items-center gap-3 p-3 rounded-lg"
                style={{
                  backgroundColor: agentColors.idle.bg,
                  border: `1px solid ${agentColors.idle.border}`
                }}
              >
                <Clock className="w-5 h-5" style={{ color: agentColors.running.primary }} />
                <div>
                  <p className="text-xs font-medium text-gray-600">Schedule</p>
                  <p className="text-sm font-semibold" style={{ color: agentColors.running.text }}>
                    {getScheduleDescription(data.configuration.schedule)}
                  </p>
                </div>
              </motion.div>

              <motion.div
                variants={cardVariants}
                className="flex items-center gap-3 p-3 rounded-lg"
                style={{
                  backgroundColor: agentColors.idle.bg,
                  border: `1px solid ${agentColors.idle.border}`
                }}
              >
                <Target className="w-5 h-5" style={{ color: agentColors.completed.primary }} />
                <div>
                  <p className="text-xs font-medium text-gray-600">Items per Run</p>
                  <p className="text-sm font-semibold" style={{ color: agentColors.running.text }}>
                    {data.configuration.maxItemsPerRun} items
                  </p>
                </div>
              </motion.div>

              <motion.div
                variants={cardVariants}
                className="flex items-center gap-3 p-3 rounded-lg"
                style={{
                  backgroundColor: agentColors.idle.bg,
                  border: `1px solid ${agentColors.idle.border}`
                }}
              >
                <Settings className="w-5 h-5" style={{ color: agentColors.error.primary }} />
                <div>
                  <p className="text-xs font-medium text-gray-600">Agent Type</p>
                  <p className="text-sm font-semibold" style={{ color: agentColors.running.text }}>
                    {getAgentDisplayName()}
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Type-specific Configuration Details */}
            <div className="space-y-4">
              <h4 className="flex items-center gap-2 font-semibold" style={typography.cardTitle}>
                <Filter className="w-4 h-4" style={{ color: typeColor.primary }} />
                Configuration Details
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.type === 'twitter' && (
                  <>
                    {data.configuration.keywords && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-600">Keywords</p>
                        <p className="text-sm" style={{ color: agentColors.running.text }}>
                          {data.configuration.keywords}
                        </p>
                      </div>
                    )}
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-600">Engagement Filters</p>
                      <p className="text-sm" style={{ color: agentColors.running.text }}>
                        {data.configuration.minLikes}+ likes, {data.configuration.minRetweets}+ retweets
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-600">Content Type</p>
                      <p className="text-sm" style={{ color: agentColors.running.text }}>
                        {data.configuration.excludeReplies ? 'Original tweets only' : 'Tweets + replies'}
                      </p>
                    </div>
                  </>
                )}

                {data.type === 'news' && (
                  <>
                    {data.configuration.categories && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-600">Categories</p>
                        <p className="text-sm" style={{ color: agentColors.running.text }}>
                          {data.configuration.categories}
                        </p>
                      </div>
                    )}
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-600">Language</p>
                      <p className="text-sm" style={{ color: agentColors.running.text }}>
                        {data.configuration.language.toUpperCase()}
                      </p>
                    </div>
                    {data.configuration.newsSources && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-600">Sources</p>
                        <p className="text-sm" style={{ color: agentColors.running.text }}>
                          {data.configuration.newsSources}
                        </p>
                      </div>
                    )}
                  </>
                )}

                {data.type === 'crewai_news' && (
                  <>
                    {data.configuration.topics && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-600">Research Topics</p>
                        <p className="text-sm" style={{ color: agentColors.running.text }}>
                          {data.configuration.topics}
                        </p>
                      </div>
                    )}
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-600">Content Sources</p>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(data.configuration.crewaiSources)
                          .filter(([_, enabled]) => enabled)
                          .map(([source, _]) => (
                            <Badge
                              key={source}
                              variant="outline"
                              className="text-xs"
                              style={{
                                borderColor: typeColor.border,
                                color: typeColor.primary,
                                backgroundColor: typeColor.bg
                              }}
                            >
                              {source.replace('_', ' ')}
                            </Badge>
                          ))}
                      </div>
                    </div>
                  </>
                )}

                {data.type === 'custom' && (
                  <>
                    {data.configuration.keywords && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-600">Keywords</p>
                        <p className="text-sm" style={{ color: agentColors.running.text }}>
                          {data.configuration.keywords}
                        </p>
                      </div>
                    )}
                    {data.configuration.categories && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-600">Categories</p>
                        <p className="text-sm" style={{ color: agentColors.running.text }}>
                          {data.configuration.categories}
                        </p>
                      </div>
                    )}
                    {data.configuration.topics && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-600">Topics</p>
                        <p className="text-sm" style={{ color: agentColors.running.text }}>
                          {data.configuration.topics}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Expected Behavior */}
      <motion.div variants={cardVariants}>
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
              <Play className="w-5 h-5" style={{ color: agentColors.running.primary }} />
              <span style={typography.cardTitle}>What Your Agent Will Do</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {expectedBehaviors.map((behavior, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className="flex items-start gap-3"
                >
                  <div 
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white mt-0.5"
                    style={{ backgroundColor: agentColors.running.primary }}
                  >
                    {index + 1}
                  </div>
                  <p 
                    className="text-sm leading-relaxed"
                    style={{ color: agentColors.idle.text }}
                  >
                    {behavior}
                  </p>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Launch Confirmation */}
      <motion.div
        variants={cardVariants}
        className="text-center p-6 rounded-xl"
        style={{
          backgroundColor: agentColors.completed.bg,
          border: `2px solid ${agentColors.completed.border}`
        }}
      >
        <motion.div
          variants={statusVariants.completed}
          animate="completed"
          className="mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4"
          style={{ backgroundColor: agentColors.completed.primary }}
        >
          <Rocket className="w-6 h-6 text-white" />
        </motion.div>
        
        <h4 
          className="mb-2"
          style={{
            ...typography.cardTitle,
            color: agentColors.completed.text
          }}
        >
          Ready for Launch! 🚀
        </h4>
        
        <p 
          className="text-sm max-w-md mx-auto"
          style={{
            color: agentColors.completed.text,
            opacity: 0.8
          }}
        >
          Your agent is configured and ready to start working. Click "Create Agent" to launch it 
          and begin automated content curation.
        </p>
      </motion.div>

      {/* Help Note */}
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
          <Info className="w-4 h-4 inline mr-1" />
          <strong>After launch:</strong> Your agent will appear on the main dashboard where you can 
          monitor its activity, view collected content, and adjust settings as needed.
        </p>
      </motion.div>
    </motion.div>
  );
};