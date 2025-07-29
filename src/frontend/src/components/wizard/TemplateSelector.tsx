import React from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { AgentType, WizardData, AgentTemplate } from './AgentCreationWizard';
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
  containerVariants
} from '@/utils/animations';
import {
  Twitter,
  Newspaper,
  Zap,
  Settings,
  CheckCircle,
  Sparkles,
  Star,
  Target,
  Layers,
  Plus,
  Briefcase,
  TrendingUp,
  Users,
  Gamepad2,
  Heart,
  Code,
  DollarSign
} from 'lucide-react';

// Template definitions for each agent type
const AGENT_TEMPLATES: Record<AgentType, AgentTemplate[]> = {
  twitter: [
    {
      id: 'twitter-brand-monitoring',
      name: 'Brand Monitoring',
      description: 'Track mentions of your brand, products, and competitors across Twitter',
      type: 'twitter',
      icon: '🏢',
      configuration: {
        keywords: 'YourBrand, @YourHandle, YourProduct',
        minLikes: 5,
        minRetweets: 2,
        excludeReplies: true,
        schedule: '0 */2 * * *',
        maxItemsPerRun: 15,
      },
      tags: ['Brand', 'Monitoring', 'Reputation'],
      isRecommended: true,
    },
    {
      id: 'twitter-industry-trends',
      name: 'Industry Trends',
      description: 'Stay updated with the latest trends and discussions in your industry',
      type: 'twitter',
      icon: '📈',
      configuration: {
        keywords: 'AI, technology, startup, innovation',
        minLikes: 20,
        minRetweets: 10,
        excludeReplies: true,
        schedule: '0 */4 * * *',
        maxItemsPerRun: 20,
      },
      tags: ['Trends', 'Industry', 'Intelligence'],
    },
    {
      id: 'twitter-competitor-tracking',
      name: 'Competitor Tracking',
      description: 'Monitor your competitors activities, announcements, and engagement',
      type: 'twitter',
      icon: '🎯',
      configuration: {
        keywords: 'Competitor1, Competitor2, @CompetitorHandle',
        minLikes: 10,
        minRetweets: 5,
        excludeReplies: false,
        schedule: '0 */6 * * *',
        maxItemsPerRun: 12,
      },
      tags: ['Competitive', 'Analysis', 'Business'],
    },
    {
      id: 'twitter-influencer-discovery',
      name: 'Influencer Discovery',
      description: 'Find influential voices and thought leaders in your niche',
      type: 'twitter',
      icon: '⭐',
      configuration: {
        keywords: 'thought leader, expert, influencer',
        minLikes: 50,
        minRetweets: 25,
        excludeReplies: true,
        schedule: '0 8 * * *',
        maxItemsPerRun: 10,
      },
      tags: ['Influencers', 'Networking', 'Growth'],
    },
  ],
  news: [
    {
      id: 'news-breaking-alerts',
      name: 'Breaking News Alerts',
      description: 'Get instant alerts for breaking news in your areas of interest',
      type: 'news',
      icon: '🚨',
      configuration: {
        categories: 'breaking, urgent, developing',
        language: 'en',
        schedule: '*/30 * * * *',
        maxItemsPerRun: 5,
      },
      tags: ['Breaking', 'Alerts', 'Real-time'],
      isRecommended: true,
    },
    {
      id: 'news-industry-updates',
      name: 'Industry Updates',
      description: 'Curated news updates for your specific industry or domain',
      type: 'news',
      icon: '📊',
      configuration: {
        categories: 'technology, business, finance',
        language: 'en',
        schedule: '0 9,17 * * *',
        maxItemsPerRun: 15,
      },
      tags: ['Industry', 'Business', 'Updates'],
    },
    {
      id: 'news-research-tracker',
      name: 'Research Tracker',
      description: 'Track research papers, studies, and academic publications',
      type: 'news',
      icon: '🔬',
      configuration: {
        categories: 'research, academic, science, study',
        language: 'en',
        schedule: '0 10 * * *',
        maxItemsPerRun: 8,
      },
      tags: ['Research', 'Academic', 'Science'],
    },
    {
      id: 'news-global-watch',
      name: 'Global News Watch',
      description: 'Monitor global news and international developments',
      type: 'news',
      icon: '🌍',
      configuration: {
        categories: 'world, international, global, politics',
        language: 'en',
        schedule: '0 6,18 * * *',
        maxItemsPerRun: 20,
      },
      tags: ['Global', 'International', 'Politics'],
    },
  ],
  crewai_news: [
    {
      id: 'crewai-business-intelligence',
      name: 'Business Intelligence',
      description: 'Comprehensive business intelligence across all platforms and sources',
      type: 'crewai_news',
      icon: '💼',
      configuration: {
        topics: 'business strategy, market analysis, industry trends, competitive intelligence',
        crewaiSources: {
          reddit: true,
          linkedin: true,
          telegram: true,
          news_websites: true,
        },
        schedule: '0 8,14,20 * * *',
        maxItemsPerRun: 25,
      },
      tags: ['Business', 'Intelligence', 'Strategy'],
      isRecommended: true,
    },
    {
      id: 'crewai-tech-research',
      name: 'Technology Research',
      description: 'Deep technology research and emerging tech trend analysis',
      type: 'crewai_news',
      icon: '🚀',
      configuration: {
        topics: 'artificial intelligence, machine learning, blockchain, quantum computing, emerging tech',
        crewaiSources: {
          reddit: true,
          linkedin: true,
          telegram: true,
          news_websites: true,
        },
        schedule: '0 9,15 * * *',
        maxItemsPerRun: 20,
      },
      tags: ['Technology', 'Research', 'Innovation'],
    },
    {
      id: 'crewai-market-analysis',
      name: 'Market Analysis',
      description: 'Financial markets, crypto, and investment opportunity analysis',
      type: 'crewai_news',
      icon: '📈',
      configuration: {
        topics: 'stock market, cryptocurrency, investing, financial markets, trading',
        crewaiSources: {
          reddit: true,
          linkedin: true,
          telegram: true,
          news_websites: true,
        },
        schedule: '0 7,12,17 * * *',
        maxItemsPerRun: 18,
      },
      tags: ['Finance', 'Markets', 'Investment'],
    },
    {
      id: 'crewai-lifestyle-trends',
      name: 'Lifestyle & Culture',
      description: 'Track lifestyle trends, culture, and consumer behavior',
      type: 'crewai_news',
      icon: '🎨',
      configuration: {
        topics: 'lifestyle, culture, fashion, travel, food, entertainment, wellness',
        crewaiSources: {
          reddit: true,
          linkedin: false,
          telegram: true,
          news_websites: true,
        },
        schedule: '0 10,16 * * *',
        maxItemsPerRun: 15,
      },
      tags: ['Lifestyle', 'Culture', 'Trends'],
    },
  ],
  custom: [
    {
      id: 'custom-blank-slate',
      name: 'Blank Slate',
      description: 'Start from scratch with completely custom configuration',
      type: 'custom',
      icon: '📝',
      configuration: {
        keywords: '',
        minLikes: 10,
        minRetweets: 5,
        excludeReplies: true,
        newsSources: '',
        categories: '',
        language: 'en',
        topics: '',
        crewaiSources: {
          reddit: false,
          linkedin: false,
          telegram: false,
          news_websites: false,
        },
        schedule: '0 */6 * * *',
        maxItemsPerRun: 10,
      },
      tags: ['Custom', 'Flexible', 'Advanced'],
      isRecommended: true,
    },
    {
      id: 'custom-developer-template',
      name: 'Developer Template',
      description: 'Pre-configured for developers with common development topics',
      type: 'custom',
      icon: '👨‍💻',
      configuration: {
        keywords: 'programming, development, coding, software, API',
        categories: 'technology, programming, software',
        topics: 'programming, web development, mobile development, DevOps',
        schedule: '0 9,17 * * *',
        maxItemsPerRun: 15,
      },
      tags: ['Development', 'Programming', 'Tech'],
    },
    {
      id: 'custom-startup-template',
      name: 'Startup Template',
      description: 'Configured for startup founders and entrepreneurs',
      type: 'custom',
      icon: '🚀',
      configuration: {
        keywords: 'startup, entrepreneur, funding, venture capital, business',
        categories: 'business, startups, entrepreneurship',
        topics: 'startup ecosystem, funding, business strategy, entrepreneurship',
        schedule: '0 8,14,20 * * *',
        maxItemsPerRun: 20,
      },
      tags: ['Startup', 'Business', 'Entrepreneurship'],
    },
  ],
};

interface TemplateSelectorProps {
  data: WizardData;
  onUpdate: (updates: Partial<WizardData>) => void;
  onNext: () => void;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  data,
  onUpdate,
  onNext,
}) => {
  const selectedType = data.type;
  const templates = selectedType ? AGENT_TEMPLATES[selectedType] : [];

  const handleTemplateSelect = (template: AgentTemplate) => {
    onUpdate({ 
      template,
      configuration: {
        ...data.configuration,
        ...template.configuration,
      }
    });
    // Auto-advance after selection
    setTimeout(onNext, 500);
  };

  const getIconForTemplate = (iconText: string) => {
    const iconMap: Record<string, React.ComponentType<any>> = {
      '🏢': Briefcase,
      '📈': TrendingUp,
      '🎯': Target,
      '⭐': Star,
      '🚨': Sparkles,
      '📊': TrendingUp,
      '🔬': Settings,
      '🌍': Target,
      '💼': Briefcase,
      '🚀': Zap,
      '🎨': Heart,
      '📝': Plus,
      '👨‍💻': Code,
      '💰': DollarSign,
    };
    
    return iconMap[iconText] || Settings;
  };

  if (!selectedType) {
    return (
      <motion.div
        variants={cardVariants}
        className="text-center space-y-4"
      >
        <div 
          className="p-8 rounded-xl border-2 border-dashed"
          style={{
            borderColor: agentColors.idle.border,
            backgroundColor: agentColors.idle.bg
          }}
        >
          <Settings 
            className="w-12 h-12 mx-auto mb-4"
            style={{ color: agentColors.idle.primary }}
          />
          <h3 
            className="mb-2"
            style={{
              ...typography.heading,
              color: agentColors.idle.text
            }}
          >
            No Agent Type Selected
          </h3>
          <p 
            style={{
              ...typography.body,
              color: agentColors.idle.text,
              opacity: 0.7
            }}
          >
            Please go back and select an agent type first.
          </p>
        </div>
      </motion.div>
    );
  }

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
          <Layers className="w-8 h-8" style={{ color: agentColors.completed.primary }} />
        </motion.div>
        
        <div>
          <h3 
            className="mb-2"
            style={{
              ...typography.heading,
              color: agentColors.running.text
            }}
          >
            Choose a Template
          </h3>
          <p 
            className="text-muted-foreground max-w-2xl mx-auto"
            style={{
              ...typography.body,
              color: agentColors.idle.text,
              opacity: 0.8
            }}
          >
            Select a pre-built template for your {selectedType} agent, or start with a blank configuration.
          </p>
        </div>
      </motion.div>

      {/* Templates Grid */}
      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        {templates.map((template, index) => {
          const isSelected = data.template?.id === template.id;
          const IconComponent = getIconForTemplate(template.icon);
          const typeColor = getAgentTypeColor(template.type);

          return (
            <motion.div
              key={template.id}
              variants={cardVariants}
              whileHover="hover"
              whileTap="tap"
              onClick={() => handleTemplateSelect(template)}
              className="cursor-pointer group relative"
            >
              <Card 
                className={`border-2 transition-all duration-300 overflow-hidden ${
                  isSelected ? 'ring-2 ring-offset-2' : ''
                }`}
                style={{
                  borderColor: isSelected ? typeColor.primary : 'transparent',
                  backgroundColor: isSelected ? `${typeColor.primary}08` : 'white',
                  ringColor: isSelected ? typeColor.primary : 'transparent',
                  borderRadius: borderRadius.xl,
                  boxShadow: isSelected ? shadows.coloredGlow(`${typeColor.primary}40`) : shadows.md
                }}
              >
                <CardContent className="p-6 space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <motion.div
                        className="p-3 rounded-xl text-2xl flex items-center justify-center"
                        style={{
                          backgroundColor: `${typeColor.primary}20`,
                          border: `1px solid ${typeColor.primary}40`
                        }}
                        whileHover={{ scale: 1.05 }}
                      >
                        {template.icon}
                      </motion.div>
                      
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 
                            className="font-semibold"
                            style={{
                              ...typography.cardTitle,
                              color: typeColor.primary
                            }}
                          >
                            {template.name}
                          </h4>
                          
                          {template.isRecommended && (
                            <Badge 
                              className="px-2 py-0.5 text-xs border-0 flex items-center gap-1"
                              style={{
                                backgroundColor: agentColors.running.primary,
                                color: 'white'
                              }}
                            >
                              <Star className="w-3 h-3" />
                              RECOMMENDED
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring' }}
                        className="p-1 rounded-full"
                        style={{ backgroundColor: typeColor.primary }}
                      >
                        <CheckCircle className="w-5 h-5 text-white" />
                      </motion.div>
                    )}
                  </div>

                  {/* Description */}
                  <p 
                    className="text-sm leading-relaxed"
                    style={{
                      color: agentColors.idle.text,
                      opacity: 0.9
                    }}
                  >
                    {template.description}
                  </p>

                  {/* Configuration Preview */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Settings className="w-4 h-4" style={{ color: typeColor.primary }} />
                      <span 
                        className="text-sm font-medium"
                        style={{ color: agentColors.running.text }}
                      >
                        Configuration Preview
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      {selectedType === 'twitter' && (
                        <>
                          {template.configuration.keywords && (
                            <div className="text-xs">
                              <span className="font-medium text-gray-600">Keywords: </span>
                              <span className="text-gray-500">{template.configuration.keywords}</span>
                            </div>
                          )}
                          <div className="text-xs">
                            <span className="font-medium text-gray-600">Min Engagement: </span>
                            <span className="text-gray-500">
                              {template.configuration.minLikes} likes, {template.configuration.minRetweets} retweets
                            </span>
                          </div>
                        </>
                      )}
                      
                      {selectedType === 'news' && (
                        <>
                          {template.configuration.categories && (
                            <div className="text-xs">
                              <span className="font-medium text-gray-600">Categories: </span>
                              <span className="text-gray-500">{template.configuration.categories}</span>
                            </div>
                          )}
                          <div className="text-xs">
                            <span className="font-medium text-gray-600">Language: </span>
                            <span className="text-gray-500">{template.configuration.language}</span>
                          </div>
                        </>
                      )}
                      
                      {selectedType === 'crewai_news' && (
                        <>
                          {template.configuration.topics && (
                            <div className="text-xs">
                              <span className="font-medium text-gray-600">Topics: </span>
                              <span className="text-gray-500">{template.configuration.topics}</span>
                            </div>
                          )}
                          <div className="text-xs">
                            <span className="font-medium text-gray-600">Sources: </span>
                            <span className="text-gray-500">
                              {Object.entries(template.configuration.crewaiSources || {})
                                .filter(([_, enabled]) => enabled)
                                .map(([source, _]) => source.replace('_', ' '))
                                .join(', ')}
                            </span>
                          </div>
                        </>
                      )}
                      
                      <div className="text-xs">
                        <span className="font-medium text-gray-600">Schedule: </span>
                        <span className="text-gray-500">{template.configuration.schedule}</span>
                      </div>
                      
                      <div className="text-xs">
                        <span className="font-medium text-gray-600">Items per run: </span>
                        <span className="text-gray-500">{template.configuration.maxItemsPerRun}</span>
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 pt-2">
                    {template.tags.map((tag, tagIndex) => (
                      <span
                        key={tagIndex}
                        className="px-2 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: agentColors.idle.bg,
                          color: agentColors.idle.text,
                          border: `1px solid ${agentColors.idle.border}`
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </CardContent>

                {/* Selection Overlay */}
                {isSelected && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 pointer-events-none rounded-xl"
                    style={{
                      background: `linear-gradient(135deg, ${typeColor.primary}10, ${typeColor.primary}05)`,
                      border: `2px solid ${typeColor.primary}`,
                      borderRadius: borderRadius.xl
                    }}
                  />
                )}
              </Card>
            </motion.div>
          );
        })}
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
          💡 <strong>Templates are starting points</strong> - you can customize all settings in the next step. 
          Choose the one closest to your needs to save time.
        </p>
      </motion.div>
    </motion.div>
  );
};