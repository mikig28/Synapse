import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Bot, MessageSquare, Users, RefreshCw, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTelegramBot } from '@/hooks/useTelegramBot';
import { useTelegramChannels } from '@/contexts/TelegramChannelsContext';

interface TelegramDiagnosticsProps {
  onRefresh?: () => void;
}

const TelegramDiagnostics: React.FC<TelegramDiagnosticsProps> = ({ onRefresh }) => {
  const { botStatus, isLoading: isBotLoading, refreshBotStatus } = useTelegramBot();
  const { channels, isLoading: isChannelsLoading } = useTelegramChannels();
  const [diagnostics, setDiagnostics] = useState<any>(null);

  useEffect(() => {
    if (botStatus && channels) {
      analyzeDiagnostics();
    }
  }, [botStatus, channels]);

  const analyzeDiagnostics = () => {
    if (!botStatus || !channels) return;

    const hasBot = botStatus.hasBot;
    const botActive = botStatus.isActive;
    const channelsCount = channels.length;
    const activeChannels = channels.filter(c => c.isActive).length;
    const channelsWithMessages = channels.filter(c => c.totalMessages > 0).length;
    const channelsWithErrors = channels.filter(c => c.lastError).length;

    let status: 'good' | 'warning' | 'error' = 'good';
    let messages: string[] = [];
    let recommendations: string[] = [];

    // Check bot configuration
    if (!hasBot) {
      status = 'error';
      messages.push('❌ No Telegram bot configured');
      recommendations.push('Configure your bot token in settings');
    } else if (!botActive) {
      status = 'error';
      messages.push('❌ Bot is configured but not active');
      recommendations.push('Check bot token validity and restart service');
    } else {
      messages.push('✅ Bot is configured and active');
    }

    // Check channels
    if (channelsCount === 0) {
      if (hasBot && botActive) {
        status = status === 'error' ? 'error' : 'warning';
        messages.push('⚠️ No channels added for monitoring');
        recommendations.push('Add channels or groups to start monitoring');
      }
    } else {
      messages.push(`📊 Monitoring ${channelsCount} channel${channelsCount !== 1 ? 's' : ''}`);
      
      if (activeChannels < channelsCount) {
        status = status === 'error' ? 'error' : 'warning';
        messages.push(`⚠️ ${channelsCount - activeChannels} channel${channelsCount - activeChannels !== 1 ? 's' : ''} inactive`);
        recommendations.push('Activate all channels for full monitoring');
      }
    }

    // Check message collection
    if (channelsCount > 0) {
      if (channelsWithMessages === 0) {
        status = status === 'error' ? 'error' : 'warning';
        messages.push('⚠️ No messages collected yet');
        recommendations.push('Ensure bot is added to channels as admin/member');
        recommendations.push('Send test messages after adding bot');
      } else if (channelsWithMessages < channelsCount) {
        status = status === 'error' ? 'error' : 'warning';
        messages.push(`📭 ${channelsCount - channelsWithMessages} channel${channelsCount - channelsWithMessages !== 1 ? 's' : ''} have no messages`);
        recommendations.push('Check bot permissions in channels without messages');
      } else {
        messages.push(`✅ All channels collecting messages`);
      }
    }

    // Check for errors
    if (channelsWithErrors > 0) {
      status = 'error';
      messages.push(`❌ ${channelsWithErrors} channel${channelsWithErrors !== 1 ? 's' : ''} have errors`);
      recommendations.push('Review channel error messages below');
    }

    setDiagnostics({
      status,
      messages,
      recommendations,
      stats: {
        hasBot,
        botActive,
        channelsCount,
        activeChannels,
        channelsWithMessages,
        channelsWithErrors
      }
    });
  };

  const handleRefresh = async () => {
    await refreshBotStatus();
    if (onRefresh) {
      onRefresh();
    }
  };

  if (isBotLoading || isChannelsLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
            <span>Running diagnostics...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!diagnostics) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600 bg-green-50 border-green-200';
      case 'warning': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good': return <CheckCircle2 className="w-5 h-5" />;
      case 'warning': case 'error': return <AlertCircle className="w-5 h-5" />;
      default: return <AlertCircle className="w-5 h-5" />;
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="w-5 h-5" />
          System Diagnostics
          <Badge variant="outline" className={getStatusColor(diagnostics.status)}>
            {diagnostics.status.toUpperCase()}
          </Badge>
        </CardTitle>
        <CardDescription>
          Automated analysis of your Telegram channels setup
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Status Messages */}
          <div className="space-y-2">
            {diagnostics.messages.map((message: string, index: number) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                {getStatusIcon(diagnostics.status)}
                <span>{message}</span>
              </div>
            ))}
          </div>

          {/* Recommendations */}
          {diagnostics.recommendations.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Recommendations:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  {diagnostics.recommendations.map((rec: string, index: number) => (
                    <li key={index} className="text-sm">{rec}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Channel Errors */}
          {channels.filter(c => c.lastError).length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Channel Issues:</h4>
              {channels.filter(c => c.lastError).map(channel => (
                <div key={channel._id} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm text-red-800">
                        {channel.channelTitle}
                      </p>
                      <p className="text-sm text-red-600 mt-1">
                        {channel.lastError}
                      </p>
                    </div>
                    <Badge variant="destructive" className="text-xs">
                      Error
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
            <div className="text-center">
              <Bot className="w-6 h-6 mx-auto mb-1 text-blue-600" />
              <div className="text-sm font-medium">
                {diagnostics.stats.hasBot ? 'Active' : 'None'}
              </div>
              <div className="text-xs text-muted-foreground">Bot Status</div>
            </div>
            <div className="text-center">
              <MessageSquare className="w-6 h-6 mx-auto mb-1 text-green-600" />
              <div className="text-sm font-medium">{diagnostics.stats.channelsCount}</div>
              <div className="text-xs text-muted-foreground">Channels</div>
            </div>
            <div className="text-center">
              <Users className="w-6 h-6 mx-auto mb-1 text-purple-600" />
              <div className="text-sm font-medium">{diagnostics.stats.channelsWithMessages}</div>
              <div className="text-xs text-muted-foreground">With Messages</div>
            </div>
            <div className="text-center">
              <AlertCircle className="w-6 h-6 mx-auto mb-1 text-red-600" />
              <div className="text-sm font-medium">{diagnostics.stats.channelsWithErrors}</div>
              <div className="text-xs text-muted-foreground">Errors</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <AnimatedButton
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Diagnostics
            </AnimatedButton>
            
            <AnimatedButton
              onClick={() => window.open('https://t.me/botfather', '_blank')}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              BotFather
            </AnimatedButton>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TelegramDiagnostics;
