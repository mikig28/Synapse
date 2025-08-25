import React, { useState } from 'react';
import { AlertCircle, CheckCircle, RefreshCw, Bot, MessageSquare, Settings } from 'lucide-react';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import axiosInstance from '@/services/axiosConfig';

interface BotDiagnosticsProps {
  botStatus: any;
  channels: any[];
  onRefresh: () => void;
}

const BotDiagnostics: React.FC<BotDiagnosticsProps> = ({ botStatus, channels, onRefresh }) => {
  const [isRunningDiagnostic, setIsRunningDiagnostic] = useState(false);
  const [diagnosticResults, setDiagnosticResults] = useState<any>(null);
  const { toast } = useToast();

  const runDiagnostic = async () => {
    setIsRunningDiagnostic(true);
    try {
      // Check bot status
      const botCheck = botStatus?.hasBot && botStatus?.isActive;
      
      // Check channels
      const channelsWithMessages = channels.filter(c => c.totalMessages > 0).length;
      const channelsWithErrors = channels.filter(c => c.lastError).length;
      const inactiveChannels = channels.filter(c => !c.isActive).length;
      
      // Check for common issues
      const issues = [];
      const recommendations = [];
      
      if (!botCheck) {
        issues.push('Bot is not active or not configured');
        recommendations.push('Configure your bot token in the bot configuration');
      }
      
      if (channels.length === 0) {
        issues.push('No channels are being monitored');
        recommendations.push('Add some channels or groups to monitor');
      } else {
        if (channelsWithMessages === 0) {
          issues.push('No messages received in any channel');
          recommendations.push('Make sure your bot is added to the channels/groups as admin/member');
          recommendations.push('Send a test message in the channel/group after adding your bot');
          recommendations.push('Check if keyword filtering is too restrictive');
        }
        
        if (channelsWithErrors > 0) {
          issues.push(`${channelsWithErrors} channel(s) have permission errors`);
          recommendations.push('Check bot permissions in channels with errors');
        }
        
        if (inactiveChannels > 0) {
          issues.push(`${inactiveChannels} channel(s) are inactive`);
          recommendations.push('Enable inactive channels in the channel list');
        }
      }

      setDiagnosticResults({
        botActive: botCheck,
        totalChannels: channels.length,
        channelsWithMessages,
        channelsWithErrors,
        inactiveChannels,
        issues,
        recommendations
      });

      if (issues.length === 0) {
        toast({
          title: "Diagnostics Complete",
          description: "No issues found! Your setup looks good.",
        });
      } else {
        toast({
          title: "Issues Found",
          description: `Found ${issues.length} issue(s) that may affect message reception.`,
          variant: "destructive"
        });
      }
      
    } catch (error) {
      toast({
        title: "Diagnostic Failed",
        description: "Could not run diagnostics. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRunningDiagnostic(false);
    }
  };

  const forceRefreshChannels = async () => {
    try {
      // Force refresh all active channels
      for (const channel of channels.filter(c => c.isActive)) {
        await axiosInstance.post(`/telegram-channels/${channel._id}/fetch`);
      }
      
      toast({
        title: "Refresh Triggered",
        description: "Forced refresh for all active channels. Check back in a moment.",
      });
      
      // Refresh the page data
      setTimeout(() => {
        onRefresh();
      }, 3000);
      
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Could not refresh channels. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
          <AlertCircle className="w-5 h-5" />
          Troubleshooting: 0 Messages Issue
        </CardTitle>
        <CardDescription className="text-amber-700 dark:text-amber-300">
          If you're seeing 0 messages, run diagnostics to find the issue
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3">
          <AnimatedButton
            onClick={runDiagnostic}
            loading={isRunningDiagnostic}
            variant="outline"
            className="border-amber-300 text-amber-700 hover:bg-amber-100"
          >
            <Settings className="w-4 h-4 mr-2" />
            Run Diagnostics
          </AnimatedButton>
          
          <AnimatedButton
            onClick={forceRefreshChannels}
            variant="outline"
            className="border-amber-300 text-amber-700 hover:bg-amber-100"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Force Refresh All
          </AnimatedButton>
        </div>

        {diagnosticResults && (
          <div className="space-y-4 mt-4 p-4 bg-white dark:bg-gray-900 rounded-lg border">
            <h4 className="font-medium flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Diagnostic Results
            </h4>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="text-center p-2 border rounded">
                <div className={`font-medium ${diagnosticResults.botActive ? 'text-green-600' : 'text-red-600'}`}>
                  {diagnosticResults.botActive ? 'Active' : 'Inactive'}
                </div>
                <div className="text-xs text-muted-foreground">Bot Status</div>
              </div>
              
              <div className="text-center p-2 border rounded">
                <div className="font-medium">{diagnosticResults.totalChannels}</div>
                <div className="text-xs text-muted-foreground">Total Channels</div>
              </div>
              
              <div className="text-center p-2 border rounded">
                <div className={`font-medium ${diagnosticResults.channelsWithMessages > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {diagnosticResults.channelsWithMessages}
                </div>
                <div className="text-xs text-muted-foreground">With Messages</div>
              </div>
              
              <div className="text-center p-2 border rounded">
                <div className={`font-medium ${diagnosticResults.channelsWithErrors > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {diagnosticResults.channelsWithErrors}
                </div>
                <div className="text-xs text-muted-foreground">With Errors</div>
              </div>
            </div>

            {diagnosticResults.issues.length > 0 && (
              <div>
                <h5 className="font-medium text-red-600 mb-2">Issues Found:</h5>
                <ul className="text-sm space-y-1">
                  {diagnosticResults.issues.map((issue: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <AlertCircle className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {diagnosticResults.recommendations.length > 0 && (
              <div>
                <h5 className="font-medium text-blue-600 mb-2">Recommendations:</h5>
                <ul className="text-sm space-y-1">
                  {diagnosticResults.recommendations.map((rec: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="w-3 h-3 text-blue-500 mt-0.5 flex-shrink-0" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Quick Fix Steps */}
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Quick Fix Steps:</h4>
          <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-decimal list-inside">
            <li>Make sure your bot (@{botStatus?.botUsername}) is added to each channel/group</li>
            <li>For channels: Add as admin with "Read Messages" permission</li>
            <li>For groups: Add as regular member</li>
            <li>Send a test message in the channel/group after adding your bot</li>
            <li>Check if keywords are filtering out messages (try removing keywords temporarily)</li>
            <li>Remember: Only messages sent AFTER your bot joins will appear</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};

export default BotDiagnostics;