import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bot,
  Plus,
  Sparkles,
  TrendingUp,
  Brain,
  Globe,
  MessageCircle,
  Zap,
  ArrowRight,
  PlayCircle,
  BookOpen
} from 'lucide-react';

interface DashboardEmptyStateProps {
  onCreateAgent: () => void;
  className?: string;
}

const agentTypes = [
  {
    type: 'crewai_news',
    icon: Brain,
    name: 'AI News Crew',
    description: 'Multi-agent system for comprehensive news gathering',
    features: ['Reddit insights', 'Telegram channels', 'News websites', 'Real-time analysis'],
    color: 'bg-purple-100 dark:bg-purple-900/20 border-purple-200',
    iconColor: 'text-purple-600'
  },
  {
    type: 'news',
    icon: Globe,
    name: 'News Agent',
    description: 'Focused news collection from RSS feeds and websites',
    features: ['RSS feeds', 'News APIs', 'Content filtering', 'Category focus'],
    color: 'bg-blue-100 dark:bg-blue-900/20 border-blue-200',
    iconColor: 'text-blue-600'
  },
  {
    type: 'twitter',
    icon: MessageCircle,
    name: 'Social Agent',
    description: 'Social media monitoring and trend analysis',
    features: ['Twitter tracking', 'Trend detection', 'Engagement metrics', 'Viral content'],
    color: 'bg-green-100 dark:bg-green-900/20 border-green-200',
    iconColor: 'text-green-600'
  }
];

const useCases = [
  {
    title: 'Market Research',
    description: 'Track industry trends and competitor mentions',
    icon: TrendingUp,
    topics: ['fintech', 'AI startups', 'crypto']
  },
  {
    title: 'Content Curation',
    description: 'Discover engaging content for your audience',
    icon: Sparkles,
    topics: ['tech news', 'design trends', 'productivity']
  },
  {
    title: 'Brand Monitoring',
    description: 'Monitor brand mentions and sentiment',
    icon: Bot,
    topics: ['your brand', 'competitors', 'industry']
  }
];

export const DashboardEmptyState: React.FC<DashboardEmptyStateProps> = ({
  onCreateAgent,
  className = ''
}) => {
  const [selectedUseCase, setSelectedUseCase] = useState<number | null>(null);

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12"
      >
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2 }}
          className="relative mb-6"
        >
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-primary/20 to-primary/40 rounded-full flex items-center justify-center">
            <Bot className="w-12 h-12 text-primary" />
          </div>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center"
          >
            <Sparkles className="w-4 h-4 text-yellow-600" />
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <h1 className="text-3xl font-bold mb-4">Welcome to Synapse AI</h1>
          <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
            Create intelligent agents that automatically gather, analyze, and curate content 
            from across the web. Your personal AI research team is just one click away.
          </p>
          
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" onClick={onCreateAgent} className="group">
              <Plus className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform" />
              Create Your First Agent
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button variant="outline" size="lg">
              <PlayCircle className="w-5 h-5 mr-2" />
              Watch Demo
            </Button>
          </div>
        </motion.div>
      </motion.div>

      {/* Agent Types */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <h2 className="text-2xl font-semibold mb-6 text-center">Choose Your Agent Type</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {agentTypes.map((agent, index) => (
            <motion.div
              key={agent.type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 + index * 0.1 }}
              whileHover={{ y: -5 }}
              className="group"
            >
              <Card className={`h-full hover:shadow-lg transition-all duration-300 cursor-pointer ${agent.color}`}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`p-3 rounded-full bg-white dark:bg-gray-800`}>
                      <agent.icon className={`w-6 h-6 ${agent.iconColor}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-2">{agent.name}</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        {agent.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {agent.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-center gap-2 text-sm">
                        <div className="w-1.5 h-1.5 bg-current rounded-full opacity-60" />
                        {feature}
                      </div>
                    ))}
                  </div>

                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-4 group-hover:bg-white group-hover:text-primary"
                    onClick={onCreateAgent}
                  >
                    Create {agent.name}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Use Cases */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
      >
        <h2 className="text-2xl font-semibold mb-6 text-center">Popular Use Cases</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {useCases.map((useCase, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.2 + index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => setSelectedUseCase(selectedUseCase === index ? null : index)}
              className="cursor-pointer"
            >
              <Card className={`transition-all duration-300 ${
                selectedUseCase === index 
                  ? 'border-primary shadow-lg' 
                  : 'hover:border-primary/50'
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <useCase.icon className="w-5 h-5 text-primary" />
                    <h3 className="font-medium">{useCase.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {useCase.description}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {useCase.topics.map((topic, topicIndex) => (
                      <Badge key={topicIndex} variant="secondary" className="text-xs">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                  
                  {selectedUseCase === index && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 pt-3 border-t"
                    >
                      <Button size="sm" onClick={onCreateAgent} className="w-full">
                        <Zap className="w-4 h-4 mr-2" />
                        Create Agent for {useCase.title}
                      </Button>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Quick Tips */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4 }}
        className="bg-muted/50 rounded-lg p-6"
      >
        <div className="flex items-start gap-4">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
            <BookOpen className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold mb-2">Getting Started Tips</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Start with specific topics for better results (e.g., "Tesla earnings" vs "cars")</li>
              <li>• CrewAI agents provide the most comprehensive coverage with multiple sources</li>
              <li>• Set up scheduling to automatically gather content throughout the day</li>
              <li>• Monitor the dashboard for real-time execution status and results</li>
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  );
};