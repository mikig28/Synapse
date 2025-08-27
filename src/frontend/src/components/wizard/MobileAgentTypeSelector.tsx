import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AgentType, WizardData } from './AgentCreationWizard';
import {
  Twitter,
  Newspaper,
  Zap,
  Settings,
  CheckCircle,
  Sparkles,
} from 'lucide-react';

// Simplified agent type configurations for mobile
const AGENT_TYPES = [
  {
    type: 'twitter' as AgentType,
    name: 'Twitter Agent',
    description: 'Monitor Twitter for trends and keywords',
    icon: Twitter,
    color: '#1DA1F2',
    difficulty: 'Easy',
  },
  {
    type: 'news' as AgentType,
    name: 'News Agent',
    description: 'Aggregate news from multiple sources',
    icon: Newspaper,
    color: '#EF4444',
    difficulty: 'Easy',
  },
  {
    type: 'crewai_news' as AgentType,
    name: 'CrewAI Multi-Agent',
    description: 'Advanced AI with multiple agents',
    icon: Zap,
    color: '#9333EA',
    difficulty: 'Advanced',
    isRecommended: true,
  },
  {
    type: 'custom' as AgentType,
    name: 'Custom Agent',
    description: 'Build your own custom agent',
    icon: Settings,
    color: '#10B981',
    difficulty: 'Expert',
  },
];

interface MobileAgentTypeSelectorProps {
  data: WizardData;
  onUpdate: (updates: Partial<WizardData>) => void;
  onNext: () => void;
}

export const MobileAgentTypeSelector: React.FC<MobileAgentTypeSelectorProps> = ({
  data,
  onUpdate,
  onNext,
}) => {
  const handleTypeSelect = (type: AgentType) => {
    onUpdate({ type });
    // Auto-advance after selection
    setTimeout(onNext, 300);
  };

  return (
    <div className="space-y-4">
      {/* Agent Type Cards */}
      {AGENT_TYPES.map((agentType) => {
        const isSelected = data.type === agentType.type;
        const IconComponent = agentType.icon;

        return (
          <motion.div
            key={agentType.type}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleTypeSelect(agentType.type)}
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
                  <div
                    className="p-2 rounded-lg flex-shrink-0"
                    style={{
                      backgroundColor: `${agentType.color}20`,
                    }}
                  >
                    <IconComponent 
                      className="w-5 h-5" 
                      style={{ color: agentType.color }} 
                    />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-sm">
                        {agentType.name}
                      </h4>
                      
                      {agentType.isRecommended && (
                        <Badge 
                          className="text-xs px-1.5 py-0"
                          variant="default"
                        >
                          <Sparkles className="w-3 h-3 mr-1" />
                          BEST
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-xs text-muted-foreground mb-2">
                      {agentType.description}
                    </p>
                    
                    <Badge 
                      variant="outline"
                      className="text-xs"
                    >
                      {agentType.difficulty}
                    </Badge>
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
      
      {/* Help text */}
      <div className="text-center p-3 bg-muted/50 rounded-lg">
        <p className="text-xs text-muted-foreground">
          💡 Not sure? Try <strong>CrewAI Multi-Agent</strong> for best results
        </p>
      </div>
    </div>
  );
};