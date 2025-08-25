import React from 'react';
import { AlertTriangle, CheckCircle, RefreshCw, Settings, Bot } from 'lucide-react';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import axiosInstance from '@/services/axiosConfig';

interface QuickDiagnosticsProps {
  channels: any[];
  botStatus: any;
}

const QuickDiagnostics: React.FC<QuickDiagnosticsProps> = ({ channels, botStatus }) => {
  const { toast } = useToast();

  // Quick analysis
  const hasChannels = channels.length > 0;
  const channelsWithMessages = channels.filter(c => c.totalMessages > 0).length;
  const channelsWithErrors = channels.filter(c => c.lastError).length;
  const allChannelsEmpty = hasChannels && channels.every(c => c.totalMessages === 0);

  const forceRefresh = async () => {
    try {
      // Force refresh all channels
      for (const channel of channels.filter(c => c.isActive)) {
        await axiosInstance.post(`/telegram-channels/${channel._id}/fetch`);
      }
      toast({
        title: "Refresh Triggered",
        description: "Checking for new messages in all channels...",
      });
      setTimeout(() => window.location.reload(), 3000);
    } catch (error) {
      toast({
        title: "Refresh Failed", 
        description: "Could not refresh channels",
        variant: "destructive"
      });
    }
  };

  // Don't show if everything is working fine
  if (hasChannels && channelsWithMessages > 0 && channelsWithErrors === 0) {
    return null;
  }

  return (
    <Card className="border-l-4 border-l-orange-400 bg-orange-50 dark:bg-orange-950 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200 text-lg">
          <Settings className="w-5 h-5" />
          Quick Diagnostics
        </CardTitle>
        <CardDescription className="text-orange-700 dark:text-orange-300">
          {allChannelsEmpty ? "No messages detected - let's fix this!" : "Channel status check"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Status */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="flex items-center gap-2 p-2 bg-white dark:bg-gray-900 rounded border">
            <Bot className="w-4 h-4 text-blue-500" />
            <div>
              <div className="font-medium">Bot</div>
              <div className={botStatus?.isActive ? "text-green-600" : "text-red-600"}>
                {botStatus?.isActive ? "Active" : "Inactive"}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-2 bg-white dark:bg-gray-900 rounded border">
            <div className="w-4 h-4 bg-blue-100 rounded text-xs flex items-center justify-center font-bold text-blue-600">
              {channels.length}
            </div>
            <div>
              <div className="font-medium">Channels</div>
              <div className="text-muted-foreground">Added</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-2 bg-white dark:bg-gray-900 rounded border">
            {channelsWithMessages > 0 ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-500" />
            )}
            <div>
              <div className="font-medium">{channelsWithMessages}</div>
              <div className="text-muted-foreground">With Messages</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-2 bg-white dark:bg-gray-900 rounded border">
            {channelsWithErrors > 0 ? (
              <AlertTriangle className="w-4 h-4 text-red-500" />
            ) : (
              <CheckCircle className="w-4 h-4 text-green-500" />
            )}
            <div>
              <div className="font-medium">{channelsWithErrors}</div>
              <div className="text-muted-foreground">Errors</div>
            </div>
          </div>
        </div>

        {/* Issues and Actions */}
        {allChannelsEmpty && (
          <div className="bg-yellow-100 dark:bg-yellow-900 border border-yellow-300 dark:border-yellow-700 rounded-lg p-3">
            <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
              🔍 Why am I seeing 0 messages?
            </h4>
            <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
              <li>• Your bot needs to be added to each channel/group as admin/member</li>
              <li>• Only messages sent AFTER your bot joins will appear</li>
              <li>• Send a test message after adding your bot</li>
              <li>• Check if keywords are filtering out messages</li>
            </ul>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <AnimatedButton
            onClick={forceRefresh}
            variant="outline"
            size="sm"
            className="border-orange-300 text-orange-700 hover:bg-orange-100"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Force Refresh All
          </AnimatedButton>
          
          <AnimatedButton
            onClick={() => window.open('https://core.telegram.org/bots#6-botfather', '_blank')}
            variant="outline" 
            size="sm"
            className="border-orange-300 text-orange-700 hover:bg-orange-100"
          >
            <Bot className="w-4 h-4 mr-2" />
            BotFather Help
          </AnimatedButton>
        </div>

        {/* Quick Steps */}
        <div className="text-xs text-muted-foreground bg-white dark:bg-gray-900 rounded border p-3">
          <strong>Quick Fix:</strong> Go to your Telegram channels → Add your bot (@{botStatus?.botUsername || 'yourbot'}) as admin → Send test message → Refresh this page
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickDiagnostics;