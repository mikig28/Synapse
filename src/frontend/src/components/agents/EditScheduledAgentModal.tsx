import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { scheduledAgentService } from '../../services/scheduledAgentService';
import {
  UpdateScheduledAgentRequest,
  ScheduledAgent,
  COMMON_CRON_EXPRESSIONS,
  COMMON_INTERVALS,
  COMMON_TIMEZONES
} from '../../types/scheduledAgent';
import {
  Plus,
  X,
  Clock,
  Calendar,
  Settings,
  AlertCircle,
  Info,
  Zap,
  RotateCcw
} from 'lucide-react';

interface EditScheduledAgentModalProps {
  agent: ScheduledAgent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (agent: ScheduledAgent) => void;
}

const EditScheduledAgentModal: React.FC<EditScheduledAgentModalProps> = ({
  agent,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState<UpdateScheduledAgentRequest>({});
  const [originalData, setOriginalData] = useState<UpdateScheduledAgentRequest>({});

  // Topic input
  const [topicInput, setTopicInput] = useState('');
  const [customCron, setCustomCron] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data when agent changes
  useEffect(() => {
    if (agent && open) {
      const initialData: UpdateScheduledAgentRequest = {
        name: agent.name,
        description: agent.description || '',
        agentConfig: {
          type: agent.agentConfig.type,
          topics: [...agent.agentConfig.topics],
          sources: { ...agent.agentConfig.sources },
          parameters: { ...agent.agentConfig.parameters },
        },
        schedule: { ...agent.schedule },
        isActive: agent.isActive,
      };
      
      setFormData(initialData);
      setOriginalData(JSON.parse(JSON.stringify(initialData)));
      setErrors({});
      setTopicInput('');
      setCustomCron('');
      setActiveTab('basic');
    }
  }, [agent, open]);

  // Reset to original data
  const resetToOriginal = () => {
    setFormData(JSON.parse(JSON.stringify(originalData)));
    setErrors({});
    setTopicInput('');
    setCustomCron('');
  };

  // Add topic
  const addTopic = () => {
    const topic = topicInput.trim();
    if (topic && !formData.agentConfig?.topics?.includes(topic)) {
      setFormData(prev => ({
        ...prev,
        agentConfig: {
          ...prev.agentConfig!,
          topics: [...(prev.agentConfig?.topics || []), topic],
        },
      }));
      setTopicInput('');
      if (errors.topics) {
        setErrors(prev => ({ ...prev, topics: '' }));
      }
    }
  };

  // Remove topic
  const removeTopic = (index: number) => {
    setFormData(prev => ({
      ...prev,
      agentConfig: {
        ...prev.agentConfig!,
        topics: prev.agentConfig?.topics?.filter((_, i) => i !== index) || [],
      },
    }));
  };

  // Update schedule type
  const updateScheduleType = (type: 'cron' | 'interval') => {
    setFormData(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule!,
        type,
        ...(type === 'cron' 
          ? { cronExpression: '0 9 * * *', intervalMinutes: undefined }
          : { intervalMinutes: 60, cronExpression: undefined }
        ),
      },
    }));
  };

  // Update cron expression
  const updateCronExpression = (expression: string) => {
    setFormData(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule!,
        cronExpression: expression,
      },
    }));
    setCustomCron('');
  };

  // Update interval
  const updateInterval = (minutes: number) => {
    setFormData(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule!,
        intervalMinutes: minutes,
      },
    }));
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.agentConfig?.topics?.length) {
      newErrors.topics = 'At least one topic is required';
    }

    if (formData.schedule?.type === 'cron') {
      const cronExpression = formData.schedule.cronExpression || '';
      if (!scheduledAgentService.validateCronExpression(cronExpression)) {
        newErrors.schedule = 'Invalid cron expression';
      }
    } else if (formData.schedule?.type === 'interval') {
      if (!formData.schedule.intervalMinutes || formData.schedule.intervalMinutes < 1) {
        newErrors.schedule = 'Interval must be at least 1 minute';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors in the form',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const updatedAgent = await scheduledAgentService.updateScheduledAgent(agent._id, formData);
      toast({
        title: 'Success',
        description: 'Scheduled agent updated successfully',
      });
      onSuccess(updatedAgent);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update scheduled agent',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle modal close
  const handleClose = () => {
    if (!loading) {
      onOpenChange(false);
    }
  };

  if (!formData.agentConfig) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Edit Scheduled Agent: {agent.name}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Basic Info
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Advanced
            </TabsTrigger>
          </TabsList>

          <div className="mt-6 overflow-y-auto max-h-[60vh]">
            <TabsContent value="basic" className="space-y-6">
              {/* Status Toggle */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label className="text-base font-medium">Agent Status</Label>
                  <p className="text-sm text-muted-foreground">
                    {formData.isActive ? 'Agent is currently active and will run on schedule' : 'Agent is paused and will not run'}
                  </p>
                </div>
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                />
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Agent Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Daily Tech News"
                  value={formData.name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-red-600">{errors.name}</p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what this agent will research..."
                  value={formData.description || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>

              {/* Topics */}
              <div className="space-y-2">
                <Label>Research Topics *</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a topic..."
                    value={topicInput}
                    onChange={(e) => setTopicInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTopic())}
                    className={errors.topics ? 'border-red-500' : ''}
                  />
                  <Button onClick={addTopic} size="sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                
                {formData.agentConfig.topics && formData.agentConfig.topics.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.agentConfig.topics.map((topic, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {topic}
                        <X
                          className="w-3 h-3 cursor-pointer hover:text-red-600"
                          onClick={() => removeTopic(index)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
                
                {errors.topics && (
                  <p className="text-sm text-red-600">{errors.topics}</p>
                )}
              </div>

              {/* Sources */}
              <div className="space-y-3">
                <Label>Content Sources</Label>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(formData.agentConfig.sources || {}).map(([source, enabled]) => (
                    <div key={source} className="flex items-center justify-between">
                      <Label htmlFor={source} className="capitalize">
                        {source.replace('_', ' ')}
                      </Label>
                      <Switch
                        id={source}
                        checked={enabled}
                        onCheckedChange={(checked) =>
                          setFormData(prev => ({
                            ...prev,
                            agentConfig: {
                              ...prev.agentConfig!,
                              sources: {
                                ...prev.agentConfig?.sources,
                                [source]: checked,
                              },
                            },
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="schedule" className="space-y-6">
              {/* Schedule Type */}
              <div className="space-y-3">
                <Label>Schedule Type</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      formData.schedule?.type === 'cron'
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:bg-muted'
                    }`}
                    onClick={() => updateScheduleType('cron')}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4" />
                      <span className="font-medium">Cron Schedule</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Advanced scheduling with specific times and patterns
                    </p>
                  </div>
                  
                  <div
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      formData.schedule?.type === 'interval'
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:bg-muted'
                    }`}
                    onClick={() => updateScheduleType('interval')}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4" />
                      <span className="font-medium">Interval Schedule</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Run every X minutes/hours
                    </p>
                  </div>
                </div>
              </div>

              {formData.schedule?.type === 'cron' ? (
                <div className="space-y-4">
                  {/* Common Cron Patterns */}
                  <div className="space-y-2">
                    <Label>Common Patterns</Label>
                    <Select onValueChange={updateCronExpression}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a common pattern..." />
                      </SelectTrigger>
                      <SelectContent>
                        {COMMON_CRON_EXPRESSIONS.map((expr) => (
                          <SelectItem key={expr.value} value={expr.value}>
                            <div>
                              <div className="font-medium">{expr.label}</div>
                              <div className="text-xs text-muted-foreground">{expr.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Custom Cron Expression */}
                  <div className="space-y-2">
                    <Label>Custom Cron Expression</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="e.g., 0 9 * * *"
                        value={customCron}
                        onChange={(e) => setCustomCron(e.target.value)}
                      />
                      <Button 
                        onClick={() => updateCronExpression(customCron)}
                        disabled={!customCron.trim()}
                        size="sm"
                      >
                        Use
                      </Button>
                    </div>
                    
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Current: <code>{formData.schedule?.cronExpression}</code>
                      </AlertDescription>
                    </Alert>
                  </div>

                  {/* Timezone */}
                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <Select 
                      value={formData.schedule?.timezone || 'UTC'} 
                      onValueChange={(timezone) =>
                        setFormData(prev => ({
                          ...prev,
                          schedule: { ...prev.schedule!, timezone },
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COMMON_TIMEZONES.map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>
                            {tz.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Interval Selection */}
                  <div className="space-y-2">
                    <Label>Run Interval</Label>
                    <Select onValueChange={(value) => updateInterval(parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select interval..." />
                      </SelectTrigger>
                      <SelectContent>
                        {COMMON_INTERVALS.map((interval) => (
                          <SelectItem key={interval.value} value={interval.value.toString()}>
                            {interval.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Custom Interval */}
                  <div className="space-y-2">
                    <Label>Custom Interval (minutes)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="10080"
                      value={formData.schedule?.intervalMinutes || ''}
                      onChange={(e) => updateInterval(parseInt(e.target.value) || 0)}
                      placeholder="Enter minutes..."
                    />
                  </div>
                </div>
              )}

              {errors.schedule && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-red-600">
                    {errors.schedule}
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="advanced" className="space-y-6">
              {/* Execution Stats */}
              <div className="grid grid-cols-3 gap-4 p-4 border rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold">{agent.executionCount}</div>
                  <div className="text-sm text-muted-foreground">Total Runs</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{agent.successCount}</div>
                  <div className="text-sm text-muted-foreground">Successful</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {agent.executionCount > 0 ? Math.round(agent.successRate) : 0}%
                  </div>
                  <div className="text-sm text-muted-foreground">Success Rate</div>
                </div>
              </div>

              {/* Parameters */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Max Items Per Run</Label>
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      value={formData.agentConfig.parameters?.maxItemsPerRun || 10}
                      onChange={(e) =>
                        setFormData(prev => ({
                          ...prev,
                          agentConfig: {
                            ...prev.agentConfig!,
                            parameters: {
                              ...prev.agentConfig?.parameters,
                              maxItemsPerRun: parseInt(e.target.value) || 10,
                            },
                          },
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Quality Threshold</Label>
                    <Select
                      value={formData.agentConfig.parameters?.qualityThreshold?.toString() || '0.7'}
                      onValueChange={(value) =>
                        setFormData(prev => ({
                          ...prev,
                          agentConfig: {
                            ...prev.agentConfig!,
                            parameters: {
                              ...prev.agentConfig?.parameters,
                              qualityThreshold: parseFloat(value),
                            },
                          },
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.5">Low (0.5)</SelectItem>
                        <SelectItem value="0.7">Medium (0.7)</SelectItem>
                        <SelectItem value="0.8">High (0.8)</SelectItem>
                        <SelectItem value="0.9">Very High (0.9)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Time Range</Label>
                  <Select
                    value={formData.agentConfig.parameters?.timeRange || '24h'}
                    onValueChange={(value) =>
                      setFormData(prev => ({
                        ...prev,
                        agentConfig: {
                          ...prev.agentConfig!,
                          parameters: {
                            ...prev.agentConfig?.parameters,
                            timeRange: value,
                          },
                        },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1h">Last 1 hour</SelectItem>
                      <SelectItem value="6h">Last 6 hours</SelectItem>
                      <SelectItem value="12h">Last 12 hours</SelectItem>
                      <SelectItem value="24h">Last 24 hours</SelectItem>
                      <SelectItem value="48h">Last 48 hours</SelectItem>
                      <SelectItem value="7d">Last 7 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {/* Actions */}
        <div className="flex justify-between pt-6 border-t">
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button variant="outline" onClick={resetToOriginal} disabled={loading}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>
          <div className="flex gap-2">
            {activeTab !== 'basic' && (
              <Button
                variant="outline"
                onClick={() => {
                  const tabs = ['basic', 'schedule', 'advanced'];
                  const currentIndex = tabs.indexOf(activeTab);
                  if (currentIndex > 0) {
                    setActiveTab(tabs[currentIndex - 1]);
                  }
                }}
              >
                Previous
              </Button>
            )}
            {activeTab !== 'advanced' ? (
              <Button
                onClick={() => {
                  const tabs = ['basic', 'schedule', 'advanced'];
                  const currentIndex = tabs.indexOf(activeTab);
                  if (currentIndex < tabs.length - 1) {
                    setActiveTab(tabs[currentIndex + 1]);
                  }
                }}
              >
                Next
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditScheduledAgentModal;