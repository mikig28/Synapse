import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { WizardData, AgentTemplate } from './AgentCreationWizard';
import {
  FileText,
  Rocket,
  Star,
  Sparkles,
  CheckCircle,
} from 'lucide-react';

// Mobile-optimized templates
const getTemplatesForType = (type: string): AgentTemplate[] => {
  const baseTemplates: Record<string, AgentTemplate[]> = {
    twitter: [
      {
        id: 'twitter-basic',
        name: 'Basic Monitoring',
        description: 'Track keywords and mentions',
        type: 'twitter',
        icon: '🔍',
        configuration: {
          keywords: 'your brand, competitor',
          minLikes: 10,
          minRetweets: 5,
        },
        tags: ['Simple', 'Quick Start'],
      },
      {
        id: 'twitter-advanced',
        name: 'Engagement Tracker',
        description: 'Monitor engagement and sentiment',
        type: 'twitter',
        icon: '📈',
        configuration: {
          keywords: 'industry, trending',
          minLikes: 50,
          minRetweets: 20,
        },
        tags: ['Popular', 'Analytics'],
        isRecommended: true,
      },
    ],
    news: [
      {
        id: 'news-basic',
        name: 'Industry News',
        description: 'Track your industry updates',
        type: 'news',
        icon: '📰',
        configuration: {
          categories: 'business, technology',
          language: 'en',
        },
        tags: ['Daily Updates'],
      },
      {
        id: 'news-research',
        name: 'Research Monitor',
        description: 'Academic and research tracking',
        type: 'news',
        icon: '🔬',
        configuration: {
          categories: 'science, research',
          language: 'en',
        },
        tags: ['Research', 'Academic'],
        isRecommended: true,
      },
    ],
    crewai_news: [
      {
        id: 'crewai-comprehensive',
        name: 'Full Coverage',
        description: 'Monitor everything important',
        type: 'crewai_news',
        icon: '🚀',
        configuration: {
          topics: 'all',
          crewaiSources: {
            reddit: true,
            linkedin: true,
            telegram: true,
            news_websites: true,
          },
        },
        tags: ['Complete', 'AI-Powered'],
        isRecommended: true,
      },
      {
        id: 'crewai-focused',
        name: 'Focused Research',
        description: 'Specific topic deep dive',
        type: 'crewai_news',
        icon: '🎯',
        configuration: {
          topics: 'specific',
          crewaiSources: {
            reddit: true,
            linkedin: true,
            telegram: false,
            news_websites: true,
          },
        },
        tags: ['Targeted', 'Efficient'],
      },
    ],
    custom: [
      {
        id: 'custom-blank',
        name: 'Start from Scratch',
        description: 'Configure everything yourself',
        type: 'custom',
        icon: '⚙️',
        configuration: {},
        tags: ['Flexible'],
      },
    ],
  };

  return baseTemplates[type] || baseTemplates.custom;
};

interface MobileTemplateSelectorProps {
  data: WizardData;
  onUpdate: (updates: Partial<WizardData>) => void;
  onNext: () => void;
}

export const MobileTemplateSelector: React.FC<MobileTemplateSelectorProps> = ({
  data,
  onUpdate,
  onNext,
}) => {
  const templates = getTemplatesForType(data.type || 'custom');

  const handleTemplateSelect = (template: AgentTemplate) => {
    onUpdate({ 
      template,
      configuration: {
        ...data.configuration,
        ...template.configuration,
      }
    });
    setTimeout(onNext, 300);
  };

  return (
    <div className="space-y-4">
      {templates.map((template) => {
        const isSelected = data.template?.id === template.id;

        return (
          <motion.div
            key={template.id}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleTemplateSelect(template)}
            className="cursor-pointer"
          >
            <Card 
              className={`border-2 transition-all ${
                isSelected ? 'border-primary bg-primary/5' : 'border-border'
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="text-2xl flex-shrink-0">
                    {template.icon}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-sm">
                        {template.name}
                      </h4>
                      
                      {template.isRecommended && (
                        <Badge 
                          className="text-xs px-1.5 py-0"
                          variant="default"
                        >
                          <Star className="w-3 h-3 mr-1" />
                          RECOMMENDED
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-xs text-muted-foreground mb-2">
                      {template.description}
                    </p>
                    
                    <div className="flex gap-1">
                      {template.tags.map((tag) => (
                        <Badge 
                          key={tag}
                          variant="outline"
                          className="text-xs px-1.5 py-0"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  {/* Selection indicator */}
                  {isSelected && (
                    <CheckCircle 
                      className="w-5 h-5 text-primary flex-shrink-0" 
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
};