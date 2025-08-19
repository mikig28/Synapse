import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { WizardData } from './AgentCreationWizard';
import { Info } from 'lucide-react';

interface MobileAgentConfigurationProps {
  data: WizardData;
  onUpdate: (updates: Partial<WizardData>) => void;
  onNext: () => void;
}

export const MobileAgentConfiguration: React.FC<MobileAgentConfigurationProps> = ({
  data,
  onUpdate,
  onNext,
}) => {
  const updateConfig = (field: string, value: any) => {
    onUpdate({
      configuration: {
        ...data.configuration,
        [field]: value,
      },
    });
  };

  const renderFieldsByType = () => {
    switch (data.type) {
      case 'twitter':
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="keywords" className="text-sm">
                Keywords to Track
              </Label>
              <Input
                id="keywords"
                placeholder="e.g., AI, machine learning"
                value={data.configuration.keywords}
                onChange={(e) => updateConfig('keywords', e.target.value)}
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Separate multiple keywords with commas
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="minLikes" className="text-sm">
                  Min. Likes
                </Label>
                <Input
                  id="minLikes"
                  type="number"
                  value={data.configuration.minLikes}
                  onChange={(e) => updateConfig('minLikes', parseInt(e.target.value))}
                  className="text-sm"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="minRetweets" className="text-sm">
                  Min. Retweets
                </Label>
                <Input
                  id="minRetweets"
                  type="number"
                  value={data.configuration.minRetweets}
                  onChange={(e) => updateConfig('minRetweets', parseInt(e.target.value))}
                  className="text-sm"
                />
              </div>
            </div>
          </>
        );

      case 'news':
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="categories" className="text-sm">
                News Categories
              </Label>
              <Input
                id="categories"
                placeholder="e.g., technology, business"
                value={data.configuration.categories}
                onChange={(e) => updateConfig('categories', e.target.value)}
                className="text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newsSources" className="text-sm">
                Preferred Sources
              </Label>
              <Input
                id="newsSources"
                placeholder="e.g., TechCrunch, Reuters"
                value={data.configuration.newsSources}
                onChange={(e) => updateConfig('newsSources', e.target.value)}
                className="text-sm"
              />
            </div>
          </>
        );

      case 'crewai_news':
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="topics" className="text-sm">
                Research Topics
              </Label>
              <Textarea
                id="topics"
                placeholder="Enter topics to research..."
                value={data.configuration.topics}
                onChange={(e) => updateConfig('topics', e.target.value)}
                rows={3}
                className="text-sm"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-sm">Data Sources</Label>
              
              <div className="space-y-2">
                {Object.entries(data.configuration.crewaiSources).map(([source, enabled]) => (
                  <div key={source} className="flex items-center justify-between">
                    <Label htmlFor={source} className="text-sm font-normal capitalize">
                      {source.replace('_', ' ')}
                    </Label>
                    <Switch
                      id={source}
                      checked={enabled as boolean}
                      onCheckedChange={(checked) => {
                        updateConfig('crewaiSources', {
                          ...data.configuration.crewaiSources,
                          [source]: checked,
                        });
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </>
        );

      default:
        return (
          <div className="text-center py-4 text-sm text-muted-foreground">
            Custom configuration coming soon
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Basic Info */}
      <div className="space-y-2">
        <Label htmlFor="name" className="text-sm">
          Agent Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="name"
          placeholder="e.g., My Twitter Monitor"
          value={data.configuration.name}
          onChange={(e) => updateConfig('name', e.target.value)}
          className="text-sm"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm">
          Description
        </Label>
        <Textarea
          id="description"
          placeholder="What will this agent do?"
          value={data.configuration.description}
          onChange={(e) => updateConfig('description', e.target.value)}
          rows={2}
          className="text-sm"
        />
      </div>

      {/* Type-specific fields */}
      {renderFieldsByType()}

      {/* Schedule */}
      <div className="space-y-2">
        <Label htmlFor="schedule" className="text-sm">
          Run Schedule
        </Label>
        <select
          id="schedule"
          value={data.configuration.schedule}
          onChange={(e) => updateConfig('schedule', e.target.value)}
          className="w-full px-3 py-2 text-sm border rounded-md"
        >
          <option value="0 */1 * * *">Every hour</option>
          <option value="0 */6 * * *">Every 6 hours</option>
          <option value="0 */12 * * *">Every 12 hours</option>
          <option value="0 0 * * *">Once daily</option>
        </select>
      </div>

      {/* Info box */}
      <div className="flex gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
        <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 dark:text-blue-300">
          You can modify these settings anytime after creating the agent.
        </p>
      </div>
    </div>
  );
};