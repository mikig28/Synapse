import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, X, Bot, Users, MessageSquare, Copy, ExternalLink, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import telegramBotService from '@/services/telegramBotService';

interface BotStatus {
  hasBot: boolean;
  isActive: boolean;
  botUsername?: string;
  botId?: number;
  monitoredChats: number;
  lastCheck?: string;
}

interface TelegramChannel {
  _id: string;
  channelId: string;
  channelTitle: string;
  channelUsername?: string;
  channelType: 'channel' | 'group' | 'supergroup';
  isActive: boolean;
  totalMessages: number;
  lastFetchedAt?: string;
  lastError?: string;
}

interface BotSetupVerificationProps {
  botStatus: BotStatus;
  channels: TelegramChannel[];
  onRefresh?: () => void;
}

interface VerificationStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'success' | 'error' | 'warning';
  details?: string;
  action?: () => void;
  actionLabel?: string;
}

const BotSetupVerification: React.FC<BotSetupVerificationProps> = ({
  botStatus,
  channels,
  onRefresh
}) => {
  const [isTestingBot, setIsTestingBot] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Text has been copied to your clipboard",
    });
  };

  const testBotConnectivity = async () => {
    if (!botStatus.hasBot) return;
    
    setIsTestingBot(true);
    try {
      const result = await telegramBotService.testBotConnectivity();
      setTestResults(result);
      toast({
        title: result.success ? "Bot test successful" : "Bot test failed",
        description: result.message,
        variant: result.success ? "default" : "destructive"
      });
    } catch (error) {
      console.error('Bot connectivity test failed:', error);
      toast({
        title: "Test failed",
        description: "Could not test bot connectivity",
        variant: "destructive"
      });
    } finally {
      setIsTestingBot(false);
    }
  };

  const getVerificationSteps = (): VerificationStep[] => {
    const steps: VerificationStep[] = [];

    // Step 1: Bot Configuration
    steps.push({
      id: 'bot-config',
      title: 'Bot Configuration',
      description: 'Personal Telegram bot is configured and active',
      status: botStatus.hasBot && botStatus.isActive ? 'success' : 'error',
      details: botStatus.hasBot 
        ? `Bot @${botStatus.botUsername} is ${botStatus.isActive ? 'active' : 'inactive'}`
        : 'No bot configured. Use the "Configure Bot" button to set up your personal bot.',
    });

    // Step 2: Bot API Connectivity
    if (botStatus.hasBot) {
      steps.push({
        id: 'bot-connectivity',
        title: 'Bot API Connectivity',
        description: 'Bot can communicate with Telegram servers',
        status: testResults ? (testResults.success ? 'success' : 'error') : 'pending',
        details: testResults ? testResults.message : 'Click "Test Bot" to verify connectivity',
        action: testBotConnectivity,
        actionLabel: 'Test Bot'
      });
    }

    // Step 3: Channels Configuration
    steps.push({
      id: 'channels-config',
      title: 'Channels/Groups Added',
      description: 'Telegram channels or groups are configured for monitoring',
      status: channels.length > 0 ? 'success' : 'warning',
      details: `${channels.length} channels/groups configured`,
    });

    // Step 4: Bot Permissions
    if (channels.length > 0) {
      const channelsWithErrors = channels.filter(c => c.lastError);
      const channelsWithMessages = channels.filter(c => c.totalMessages > 0);
      
      let status: 'pending' | 'success' | 'error' | 'warning' = 'pending';
      let details = '';
      
      if (channelsWithMessages.length === channels.length) {
        status = 'success';
        details = 'All channels are receiving messages successfully';
      } else if (channelsWithMessages.length > 0) {
        status = 'warning';
        details = `${channelsWithMessages.length}/${channels.length} channels receiving messages`;
      } else if (channelsWithErrors.length > 0) {
        status = 'error';
        details = 'Bot lacks permissions in some channels';
      } else {
        status = 'warning';
        details = 'No messages received yet - bot may need to be added to channels';
      }

      steps.push({
        id: 'bot-permissions',
        title: 'Bot Permissions & Access',
        description: 'Bot has proper permissions to read messages',
        status,
        details,
      });
    }

    // Step 5: Message Flow
    if (channels.length > 0) {
      const totalMessages = channels.reduce((sum, c) => sum + c.totalMessages, 0);
      steps.push({
        id: 'message-flow',
        title: 'Message Collection',
        description: 'Messages are being collected from monitored channels',
        status: totalMessages > 0 ? 'success' : 'warning',
        details: `${totalMessages} messages collected across all channels`,
      });
    }

    return steps;
  };

  const getStatusIcon = (status: VerificationStep['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'error':
        return <X className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStatusColor = (status: VerificationStep['status']) => {
    switch (status) {
      case 'success':
        return 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950';
      case 'error':
        return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950';
      default:
        return 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950';
    }
  };

  const verificationSteps = getVerificationSteps();
  const hasIssues = verificationSteps.some(step => step.status === 'error' || step.status === 'warning');

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="w-5 h-5" />
          Bot Setup Verification
          {!hasIssues && <Badge className="bg-green-100 text-green-800">All Good</Badge>}
          {hasIssues && <Badge variant="secondary">Issues Detected</Badge>}
        </CardTitle>
        <CardDescription>
          Diagnostic report for your Telegram bot and channel monitoring setup
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Zero Messages Alert */}
        {botStatus.hasBot && channels.length > 0 && channels.every(c => c.totalMessages === 0) && (
          <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <AlertTitle className="text-red-800 dark:text-red-200">
              Critical: No Messages Received
            </AlertTitle>
            <AlertDescription className="text-red-700 dark:text-red-300">
              <div className="space-y-2">
                <p>Your bot is configured and {channels.length} channels are added, but no messages are being received.</p>
                <div className="bg-red-100 dark:bg-red-900 p-3 rounded border-l-4 border-red-400">
                  <p className="font-semibold mb-1">Most Likely Issue:</p>
                  <p className="text-sm">Your bot (@{botStatus.botUsername}) hasn't been added to the actual Telegram channels/groups yet.</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <AnimatedButton
                    size="sm"
                    onClick={() => copyToClipboard(`@${botStatus.botUsername}`)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy Bot Username
                  </AnimatedButton>
                  <AnimatedButton
                    size="sm"
                    variant="outline"
                    onClick={() => window.open('https://telegram.org/', '_blank')}
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Open Telegram
                  </AnimatedButton>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Verification Steps */}
        <div className="space-y-3">
          {verificationSteps.map((step, index) => (
            <div
              key={step.id}
              className={`border rounded-lg p-4 ${getStatusColor(step.status)}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-white dark:bg-gray-800 border">
                  {getStatusIcon(step.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">
                      Step {index + 1}: {step.title}
                    </h4>
                    {step.action && (
                      <AnimatedButton
                        size="sm"
                        variant="outline"
                        onClick={step.action}
                        loading={step.id === 'bot-connectivity' && isTestingBot}
                      >
                        {step.id === 'bot-connectivity' && isTestingBot ? (
                          <Zap className="w-3 h-3 mr-1" />
                        ) : null}
                        {step.actionLabel}
                      </AnimatedButton>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {step.description}
                  </p>
                  {step.details && (
                    <p className="text-sm mt-2 font-mono bg-white dark:bg-gray-800 p-2 rounded border">
                      {step.details}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Channel Status Breakdown */}
        {channels.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Channel Status Breakdown
            </h4>
            <div className="grid gap-2 md:grid-cols-2">
              {channels.map((channel) => (
                <div
                  key={channel._id}
                  className="flex items-center justify-between p-2 border rounded text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{channel.channelTitle}</p>
                    <p className="text-xs text-muted-foreground">
                      {channel.channelUsername && `@${channel.channelUsername} • `}
                      {channel.channelType}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={channel.totalMessages > 0 ? "default" : "secondary"}>
                      {channel.totalMessages} msgs
                    </Badge>
                    {channel.lastError ? (
                      <AlertTriangle className="w-4 h-4 text-red-600" title={channel.lastError} />
                    ) : channel.totalMessages > 0 ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-gray-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t">
          {onRefresh && (
            <AnimatedButton
              variant="outline"
              onClick={onRefresh}
              size="sm"
            >
              <Bot className="w-4 h-4 mr-1" />
              Refresh Status
            </AnimatedButton>
          )}
          
          {botStatus.hasBot && (
            <AnimatedButton
              variant="outline"
              onClick={() => copyToClipboard(`@${botStatus.botUsername}`)}
              size="sm"
            >
              <Copy className="w-4 h-4 mr-1" />
              Copy Bot Username
            </AnimatedButton>
          )}
        </div>
        
        {/* Quick Fix Guide */}
        {hasIssues && (
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
              🔧 Quick Fix Guide
            </h4>
            <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              {!botStatus.hasBot && (
                <p>• Click "Configure Bot" to set up your personal Telegram bot</p>
              )}
              {channels.length === 0 && (
                <p>• Click "Add Channel" to monitor your first Telegram channel/group</p>
              )}
              {channels.length > 0 && channels.every(c => c.totalMessages === 0) && (
                <>
                  <p>• Go to your Telegram app and search for <code>@{botStatus.botUsername}</code></p>
                  <p>• For <strong>Groups</strong>: Add the bot as a regular member</p>
                  <p>• For <strong>Channels</strong>: Add the bot as an administrator</p>
                  <p>• Send a test message after adding the bot</p>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BotSetupVerification;