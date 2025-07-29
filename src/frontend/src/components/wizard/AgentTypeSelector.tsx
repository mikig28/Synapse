import React from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { AgentType, WizardData } from './AgentCreationWizard';
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
  TrendingUp,
  Users,
  Globe
} from 'lucide-react';

// Agent type configurations
const AGENT_TYPES = [
  {
    type: 'twitter' as AgentType,
    name: 'Twitter Agent',
    description: 'Monitor Twitter for trending topics, keywords, and engagement metrics',
    icon: Twitter,
    color: '#1DA1F2',
    features: [
      'Real-time tweet monitoring',
      'Engagement tracking',
      'Keyword filtering',
      'Sentiment analysis'
    ],
    useCases: [
      'Brand monitoring',
      'Competitor tracking',
      'Industry trends',
      'Influencer discovery'
    ],
    recommended: 'Best for social media monitoring and brand awareness',
    tags: ['Social Media', 'Real-time', 'Engagement'],
    difficulty: 'Easy',
  },
  {
    type: 'news' as AgentType,
    name: 'News Agent',
    description: 'Aggregate and curate news articles from multiple sources with AI filtering',
    icon: Newspaper,
    color: '#EF4444',
    features: [
      'Multi-source aggregation',
      'Category filtering',
      'Language support',
      'Quality scoring'
    ],
    useCases: [
      'Industry updates',
      'Breaking news alerts',
      'Research tracking',
      'Content curation'
    ],
    recommended: 'Perfect for staying updated with industry news and trends',
    tags: ['News', 'Research', 'Content'],
    difficulty: 'Easy',
  },
  {
    type: 'crewai_news' as AgentType,
    name: 'CrewAI 2025 Multi-Agent',
    description: 'Advanced AI system with multiple specialized agents working together',
    icon: Zap,
    color: '#9333EA',
    features: [
      'Multi-agent collaboration',
      'Cross-platform intelligence',
      'Advanced filtering',
      'Topic-agnostic research'
    ],
    useCases: [
      'Complex research',
      'Multi-source analysis',
      'Strategic insights',
      'Comprehensive monitoring'
    ],
    recommended: 'Most powerful option for complex intelligence gathering',
    tags: ['AI-Powered', 'Multi-Agent', 'Advanced'],
    difficulty: 'Advanced',
    isRecommended: true,
    isNew: true,
  },
  {
    type: 'custom' as AgentType,
    name: 'Custom Agent',
    description: 'Build a custom agent with your own configuration and parameters',
    icon: Settings,
    color: '#10B981',
    features: [
      'Custom configuration',
      'Flexible parameters',
      'API integrations',
      'Tailored workflows'
    ],
    useCases: [
      'Specialized monitoring',
      'Custom workflows',
      'API integrations',
      'Unique requirements'
    ],
    recommended: 'For developers and advanced users with specific needs',
    tags: ['Custom', 'Flexible', 'Advanced'],
    difficulty: 'Expert',
  },
];

interface AgentTypeSelectorProps {
  data: WizardData;
  onUpdate: (updates: Partial<WizardData>) => void;
  onNext: () => void;
}

export const AgentTypeSelector: React.FC<AgentTypeSelectorProps> = ({
  data,
  onUpdate,
  onNext,
}) => {
  const handleTypeSelect = (type: AgentType) => {
    onUpdate({ type });
    // Auto-advance after a short delay for better UX
    setTimeout(onNext, 500);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy':
        return agentColors.completed;
      case 'Advanced':
        return agentColors.running;
      case 'Expert':
        return agentColors.error;
      default:
        return agentColors.idle;
    }
  };

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
          <Globe className="w-8 h-8" style={{ color: agentColors.running.primary }} />
        </motion.div>
        
        <div>
          <h3 
            className="mb-2"
            style={{
              ...typography.heading,
              color: agentColors.running.text
            }}
          >
            Choose Your Agent Type
          </h3>
          <p 
            className="text-muted-foreground max-w-2xl mx-auto"
            style={{
              ...typography.body,
              color: agentColors.idle.text,
              opacity: 0.8
            }}
          >
            Select the type of AI agent that best fits your needs. Each type is optimized for different use cases and data sources.
          </p>
        </div>
      </motion.div>

      {/* Agent Type Cards */}
      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        {AGENT_TYPES.map((agentType, index) => {
          const isSelected = data.type === agentType.type;
          const IconComponent = agentType.icon;
          const difficultyColor = getDifficultyColor(agentType.difficulty);

          return (
            <motion.div
              key={agentType.type}
              variants={cardVariants}
              whileHover="hover"
              whileTap="tap"
              onClick={() => handleTypeSelect(agentType.type)}
              className="cursor-pointer group relative"
            >
              <Card 
                className={`border-2 transition-all duration-300 overflow-hidden ${
                  isSelected ? 'ring-2 ring-offset-2' : ''
                }`}
                style={{
                  borderColor: isSelected ? agentType.color : 'transparent',
                  backgroundColor: isSelected ? `${agentType.color}08` : 'white',
                  ringColor: isSelected ? agentType.color : 'transparent',
                  borderRadius: borderRadius.xl,
                  boxShadow: isSelected ? shadows.coloredGlow(`${agentType.color}40`) : shadows.md
                }}
              >
                <CardContent className="p-6 space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <motion.div
                        className="p-3 rounded-xl"
                        style={{
                          backgroundColor: `${agentType.color}20`,
                          border: `1px solid ${agentType.color}40`
                        }}
                        whileHover={{ scale: 1.05 }}
                      >
                        <IconComponent 
                          className="w-6 h-6" 
                          style={{ color: agentType.color }} 
                        />
                      </motion.div>
                      
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 
                            className="font-semibold"
                            style={{
                              ...typography.cardTitle,
                              color: agentType.color
                            }}
                          >
                            {agentType.name}
                          </h4>
                          
                          {agentType.isNew && (
                            <Badge 
                              className="px-2 py-0.5 text-xs border-0"
                              style={{
                                backgroundColor: agentColors.completed.primary,
                                color: 'white'
                              }}
                            >
                              NEW
                            </Badge>
                          )}
                          
                          {agentType.isRecommended && (
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
                        </div>
                        
                        <Badge 
                          variant="outline"
                          className="text-xs"
                          style={{
                            borderColor: difficultyColor.border,
                            color: difficultyColor.text,
                            backgroundColor: difficultyColor.bg
                          }}
                        >
                          {agentType.difficulty}
                        </Badge>
                      </div>
                    </div>
                    
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring' }}
                        className="p-1 rounded-full"
                        style={{ backgroundColor: agentType.color }}
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
                    {agentType.description}
                  </p>

                  {/* Features */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" style={{ color: agentType.color }} />
                      <span 
                        className="text-sm font-medium"
                        style={{ color: agentColors.running.text }}
                      >
                        Key Features
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {agentType.features.map((feature, featureIndex) => (
                        <div 
                          key={featureIndex}
                          className="flex items-center gap-2 text-xs"
                          style={{ color: agentColors.idle.text, opacity: 0.8 }}
                        >
                          <div 
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: agentType.color }}
                          />
                          {feature}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Use Cases */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" style={{ color: agentType.color }} />
                      <span 
                        className="text-sm font-medium"
                        style={{ color: agentColors.running.text }}
                      >
                        Perfect For
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {agentType.useCases.map((useCase, useCaseIndex) => (
                        <Badge
                          key={useCaseIndex}
                          variant="outline"
                          className="text-xs px-2 py-1"
                          style={{
                            borderColor: `${agentType.color}40`,
                            color: agentType.color,
                            backgroundColor: `${agentType.color}08`
                          }}
                        >
                          {useCase}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Recommended Note */}
                  <div 
                    className="text-xs p-3 rounded-lg border"
                    style={{
                      backgroundColor: `${agentType.color}08`,
                      borderColor: `${agentType.color}20`,
                      color: agentColors.idle.text
                    }}
                  >
                    💡 {agentType.recommended}
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 pt-2">
                    {agentType.tags.map((tag, tagIndex) => (
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
                      background: `linear-gradient(135deg, ${agentType.color}10, ${agentType.color}05)`,
                      border: `2px solid ${agentType.color}`,
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
          💡 <strong>Not sure which to choose?</strong> Start with the CrewAI 2025 Multi-Agent for the most comprehensive coverage, 
          or choose Twitter Agent for simple social media monitoring.
        </p>
      </motion.div>
    </motion.div>
  );
};