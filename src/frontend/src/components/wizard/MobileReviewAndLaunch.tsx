import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { WizardData } from './AgentCreationWizard';
import {
  Bot,
  Calendar,
  Hash,
  FileText,
  CheckCircle,
} from 'lucide-react';

interface MobileReviewAndLaunchProps {
  data: WizardData;
  onUpdate: (updates: Partial<WizardData>) => void;
  onNext: () => void;
}

export const MobileReviewAndLaunch: React.FC<MobileReviewAndLaunchProps> = ({
  data,
  onUpdate,
  onNext,
}) => {
  const getScheduleText = (schedule: string) => {
    const scheduleMap: Record<string, string> = {
      '0 */1 * * *': 'Every hour',
      '0 */6 * * *': 'Every 6 hours',
      '0 */12 * * *': 'Every 12 hours',
      '0 0 * * *': 'Once daily',
    };
    return scheduleMap[schedule] || schedule;
  };

  const getTypeDisplayName = (type: string) => {
    const typeMap: Record<string, string> = {
      'twitter': 'Twitter Agent',
      'news': 'News Agent',
      'crewai_news': 'CrewAI Multi-Agent',
      'custom': 'Custom Agent',
    };
    return typeMap[type] || type;
  };

  return (
    <div className="space-y-4">
      {/* Success Icon */}
      <div className="text-center py-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 mb-3">
          <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-lg font-semibold">Ready to Launch!</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Review your agent configuration
        </p>
      </div>

      {/* Configuration Summary */}
      <Card>
        <CardContent className="p-4 space-y-3">
          {/* Name */}
          <div className="flex items-start gap-3">
            <Bot className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Agent Name</p>
              <p className="text-sm font-medium">
                {data.configuration.name || 'Unnamed Agent'}
              </p>
            </div>
          </div>

          {/* Type */}
          <div className="flex items-start gap-3">
            <Hash className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Type</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm font-medium">
                  {getTypeDisplayName(data.type || '')}
                </p>
                {data.template && (
                  <Badge variant="outline" className="text-xs">
                    {data.template.name}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          {data.configuration.description && (
            <div className="flex items-start gap-3">
              <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Description</p>
                <p className="text-sm">
                  {data.configuration.description}
                </p>
              </div>
            </div>
          )}

          {/* Schedule */}
          <div className="flex items-start gap-3">
            <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Schedule</p>
              <p className="text-sm font-medium">
                {getScheduleText(data.configuration.schedule)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Type-specific Configuration */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h4 className="text-sm font-semibold mb-2">Configuration Details</h4>
          
          {data.type === 'twitter' && (
            <>
              {data.configuration.keywords && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Keywords: </span>
                  <span>{data.configuration.keywords}</span>
                </div>
              )}
              <div className="text-sm">
                <span className="text-muted-foreground">Min. engagement: </span>
                <span>{data.configuration.minLikes} likes, {data.configuration.minRetweets} retweets</span>
              </div>
            </>
          )}

          {data.type === 'news' && (
            <>
              {data.configuration.categories && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Categories: </span>
                  <span>{data.configuration.categories}</span>
                </div>
              )}
              {data.configuration.newsSources && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Sources: </span>
                  <span>{data.configuration.newsSources}</span>
                </div>
              )}
            </>
          )}

          {data.type === 'crewai_news' && (
            <>
              {data.configuration.topics && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Topics: </span>
                  <span>{data.configuration.topics}</span>
                </div>
              )}
              <div className="text-sm">
                <span className="text-muted-foreground">Active sources: </span>
                <span>
                  {Object.entries(data.configuration.crewaiSources)
                    .filter(([_, enabled]) => enabled)
                    .map(([source]) => source.replace('_', ' '))
                    .join(', ')}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Final Note */}
      <div className="text-center p-3 bg-primary/5 rounded-lg">
        <p className="text-xs text-primary">
          🚀 Click "Create Agent" to launch your AI agent
        </p>
      </div>
    </div>
  );
};