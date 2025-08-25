import React, { useState } from 'react';
import { Bot, Users, MessageSquare, ChevronRight, Copy, ExternalLink, CheckCircle2, AlertTriangle, Play } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

interface BotAdditionGuideProps {
  botUsername?: string;
  channels: Array<{
    _id: string;
    channelId: string;
    channelTitle: string;
    channelUsername?: string;
    channelType: 'channel' | 'group' | 'supergroup';
    totalMessages: number;
  }>;
  onRefresh?: () => void;
}

interface Step {
  id: string;
  title: string;
  description: string;
  instructions: string[];
  tips?: string[];
  copyableText?: string;
  externalLink?: string;
}

const BotAdditionGuide: React.FC<BotAdditionGuideProps> = ({
  botUsername,
  channels,
  onRefresh
}) => {
  const [activeStep, setActiveStep] = useState<string>('overview');
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const copyToClipboard = (text: string, description: string = 'Text') => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${description} copied to clipboard`,
    });
  };

  const markStepCompleted = (stepId: string) => {
    setCompletedSteps(prev => new Set([...prev, stepId]));
    toast({
      title: "Step completed!",
      description: "Great job! Move to the next step.",
    });
  };

  const channelsWithoutMessages = channels.filter(c => c.totalMessages === 0);
  const channelsWithMessages = channels.filter(c => c.totalMessages > 0);

  const getStepsForChannelType = (channelType: 'channel' | 'group' | 'supergroup'): Step[] => {
    if (channelType === 'channel') {
      return [
        {
          id: 'find-channel',
          title: 'Find Your Channel',
          description: 'Navigate to the Telegram channel where you want to add your bot',
          instructions: [
            'Open Telegram app (desktop or mobile)',
            'Search for your channel or go to it directly',
            'Make sure you are an admin of the channel',
            'If not admin, ask channel owner to add you as admin first'
          ],
          tips: [
            'Only channel admins can add bots',
            'Public channels start with @username',
            'Private channels have invite links'
          ]
        },
        {
          id: 'add-bot-to-channel',
          title: 'Add Bot as Administrator',
          description: 'Add your bot to the channel with proper permissions',
          instructions: [
            'In your channel, click on the channel name/title',
            'Select "Administrators" or "Manage Channel"',
            'Tap "Add Administrator" or similar',
            `Search for "${botUsername}" and select it`,
            'Grant at least "Post Messages" and "Delete Messages" permissions',
            'Confirm and save the changes'
          ],
          copyableText: botUsername,
          tips: [
            'Bot needs admin privileges to read channel messages',
            'Minimum required permission: "Post Messages"',
            'Optional: "Delete Messages" for better management'
          ]
        },
        {
          id: 'test-channel',
          title: 'Test Message Reception',
          description: 'Send a test message to verify bot is receiving messages',
          instructions: [
            'Post a message in the channel',
            'Wait 10-30 seconds for processing',
            'Check Synapse dashboard for the new message',
            'If no message appears, verify bot permissions'
          ],
          tips: [
            'Historical messages are not accessible',
            'Only new messages after bot addition are monitored',
            'Message processing may take up to 30 seconds'
          ]
        }
      ];
    } else {
      // Group and Supergroup
      return [
        {
          id: 'find-group',
          title: 'Find Your Group',
          description: 'Navigate to the Telegram group where you want to add your bot',
          instructions: [
            'Open Telegram app (desktop or mobile)',
            'Go to your target group chat',
            'Make sure you are a member or admin of the group'
          ],
          tips: [
            'Groups can be private or public',
            'You need to be a member to add bots',
            'Admin privileges help but are not always required'
          ]
        },
        {
          id: 'add-bot-to-group',
          title: 'Add Bot as Member',
          description: 'Add your bot to the group as a regular member',
          instructions: [
            'In your group, tap the group name at the top',
            'Select "Add Members" or "Invite to Group"',
            `Search for "${botUsername}" in the search box`,
            'Select your bot from the search results',
            'Tap "Add" or "Invite" to add the bot',
            'Bot should now appear in the member list'
          ],
          copyableText: botUsername,
          tips: [
            'Bot only needs to be a regular member for groups',
            'Some groups require admin approval for bots',
            'If addition fails, check group privacy settings'
          ]
        },
        {
          id: 'test-group',
          title: 'Test Message Reception',
          description: 'Send a test message to verify bot is receiving messages',
          instructions: [
            'Send a message in the group',
            'Wait 10-30 seconds for processing',
            'Check Synapse dashboard for the new message',
            'If no message appears, check bot member status'
          ],
          tips: [
            'Bot can only see messages sent after it was added',
            'In some groups, bots need explicit permission to read messages',
            'Message processing may take up to 30 seconds'
          ]
        }
      ];
    }
  };

  const getAllSteps = (): Step[] => {
    const allSteps: Step[] = [];
    
    // Add overview step
    allSteps.push({
      id: 'overview',
      title: 'Setup Overview',
      description: 'Understand what needs to be done',
      instructions: [
        `You have ${channels.length} channels/groups configured`,
        `${channelsWithoutMessages.length} need bot setup`,
        `${channelsWithMessages.length} are working correctly`,
        'Follow the steps below for each channel type'
      ],
      tips: [
        'Different setup process for channels vs groups',
        'Channels require admin privileges',
        'Groups only need member access',
        'Historical messages cannot be accessed'
      ]
    });

    // Add steps for each unique channel type
    const channelTypes = new Set(channelsWithoutMessages.map(c => c.channelType));
    channelTypes.forEach(type => {
      const stepsForType = getStepsForChannelType(type);
      allSteps.push(...stepsForType);
    });

    return allSteps;
  };

  const allSteps = getAllSteps();

  const renderChannelList = () => (
    <div className="space-y-3">
      <h4 className="font-medium text-sm">Your Configured Channels:</h4>
      
      {channelsWithMessages.length > 0 && (
        <div>
          <h5 className="text-xs font-medium text-green-700 dark:text-green-300 mb-2 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Working Correctly ({channelsWithMessages.length})
          </h5>
          <div className="space-y-2">
            {channelsWithMessages.map(channel => (
              <div key={channel._id} className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded text-sm">
                <div>
                  <p className="font-medium">{channel.channelTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    {channel.channelUsername && `@${channel.channelUsername} • `}
                    {channel.channelType}
                  </p>
                </div>
                <Badge className="bg-green-100 text-green-800">
                  {channel.totalMessages} msgs
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {channelsWithoutMessages.length > 0 && (
        <div>
          <h5 className="text-xs font-medium text-red-700 dark:text-red-300 mb-2 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Need Setup ({channelsWithoutMessages.length})
          </h5>
          <div className="space-y-2">
            {channelsWithoutMessages.map(channel => (
              <div key={channel._id} className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded text-sm">
                <div>
                  <p className="font-medium">{channel.channelTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    {channel.channelUsername && `@${channel.channelUsername} • `}
                    {channel.channelType}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {channel.channelType}
                  </Badge>
                  <Badge className="bg-red-100 text-red-800">
                    0 msgs
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderStepContent = (step: Step) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{step.title}</h3>
          <p className="text-sm text-muted-foreground">{step.description}</p>
        </div>
        {completedSteps.has(step.id) && (
          <CheckCircle2 className="w-6 h-6 text-green-600" />
        )}
      </div>

      <div className="space-y-3">
        <h4 className="font-medium text-sm">Instructions:</h4>
        <ol className="space-y-2">
          {step.instructions.map((instruction, index) => (
            <li key={index} className="flex items-start gap-3 text-sm">
              <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full text-xs flex items-center justify-center font-medium">
                {index + 1}
              </span>
              <span>{instruction}</span>
            </li>
          ))}
        </ol>
      </div>

      {step.copyableText && (
        <div className="bg-muted p-3 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm">{step.copyableText}</span>
            <AnimatedButton
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(step.copyableText!, 'Bot username')}
            >
              <Copy className="w-3 h-3 mr-1" />
              Copy
            </AnimatedButton>
          </div>
        </div>
      )}

      {step.tips && step.tips.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <h4 className="font-medium text-blue-800 dark:text-blue-200 text-sm mb-2">💡 Tips:</h4>
          <ul className="space-y-1">
            {step.tips.map((tip, index) => (
              <li key={index} className="text-xs text-blue-700 dark:text-blue-300">
                • {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-2 pt-4">
        <AnimatedButton
          onClick={() => markStepCompleted(step.id)}
          disabled={completedSteps.has(step.id)}
          className="flex items-center gap-2"
        >
          {completedSteps.has(step.id) ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          {completedSteps.has(step.id) ? 'Completed' : 'Mark as Done'}
        </AnimatedButton>

        <AnimatedButton
          variant="outline"
          onClick={() => window.open('https://telegram.org/', '_blank')}
        >
          <ExternalLink className="w-4 h-4 mr-1" />
          Open Telegram
        </AnimatedButton>
      </div>
    </div>
  );

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="w-5 h-5" />
          Bot Addition Guide
          {channelsWithoutMessages.length === 0 ? (
            <Badge className="bg-green-100 text-green-800">All Set</Badge>
          ) : (
            <Badge variant="secondary">{channelsWithoutMessages.length} Pending</Badge>
          )}
        </CardTitle>
        <CardDescription>
          Step-by-step guide to add your bot (@{botUsername}) to Telegram channels and groups
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Critical Alert for 0 messages */}
        {channelsWithoutMessages.length > 0 && (
          <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <AlertTitle className="text-amber-800 dark:text-amber-200">
              Bot Setup Required
            </AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              <div className="space-y-2">
                <p>Your bot is configured but not receiving messages from {channelsWithoutMessages.length} channels/groups.</p>
                <p className="font-semibold">Next Action: Add @{botUsername} to your Telegram channels/groups following the guide below.</p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Channel Status */}
        {renderChannelList()}

        {/* Steps Navigation */}
        {channelsWithoutMessages.length > 0 && (
          <Tabs value={activeStep} onValueChange={setActiveStep}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="overview" className="text-xs">
                Overview
              </TabsTrigger>
              <TabsTrigger value="find-channel" className="text-xs">
                Find
              </TabsTrigger>
              <TabsTrigger value="add-bot-to-channel" className="text-xs">
                Add Bot
              </TabsTrigger>
              <TabsTrigger value="test-channel" className="text-xs">
                Test
              </TabsTrigger>
            </TabsList>

            {allSteps.map(step => (
              <TabsContent key={step.id} value={step.id} className="mt-4">
                {renderStepContent(step)}
              </TabsContent>
            ))}
          </Tabs>
        )}

        {/* Success Message */}
        {channelsWithoutMessages.length === 0 && (
          <div className="text-center py-8">
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">All Channels Setup Complete!</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Your bot is successfully receiving messages from all configured channels.
            </p>
            {onRefresh && (
              <AnimatedButton onClick={onRefresh} variant="outline">
                <MessageSquare className="w-4 h-4 mr-2" />
                Refresh Status
              </AnimatedButton>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <AnimatedButton
            variant="outline"
            onClick={() => copyToClipboard(`@${botUsername}`, 'Bot username')}
            size="sm"
          >
            <Copy className="w-4 h-4 mr-1" />
            Copy @{botUsername}
          </AnimatedButton>
          
          <AnimatedButton
            variant="outline"
            onClick={() => window.open('https://telegram.org/', '_blank')}
            size="sm"
          >
            <ExternalLink className="w-4 h-4 mr-1" />
            Open Telegram
          </AnimatedButton>

          {onRefresh && (
            <AnimatedButton
              onClick={onRefresh}
              size="sm"
            >
              <MessageSquare className="w-4 h-4 mr-1" />
              Check Status
            </AnimatedButton>
          )}
        </div>
        
        {/* Pro Tips */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h4 className="font-medium text-sm mb-2">🚀 Pro Tips:</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Channels require admin privileges, groups only need member access</li>
            <li>• Historical messages cannot be accessed due to Telegram Bot API limitations</li>
            <li>• Message processing typically takes 10-30 seconds</li>
            <li>• If bot stops working, check if it was removed or permissions changed</li>
            <li>• For private channels, bot must be added by a channel admin</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default BotAdditionGuide;