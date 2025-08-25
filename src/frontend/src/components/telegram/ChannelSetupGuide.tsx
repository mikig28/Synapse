import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Bot, Users, Hash, ExternalLink, Copy, Check, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface ChannelSetupGuideProps {
  botUsername?: string;
  onAddChannel: () => void;
}

const ChannelSetupGuide: React.FC<ChannelSetupGuideProps> = ({ botUsername, onAddChannel }) => {
  const [expandedSection, setExpandedSection] = useState<string | null>('channels');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const { toast } = useToast();

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(label);
      setTimeout(() => setCopiedText(null), 2000);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard",
        variant: "destructive"
      });
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const sections = [
    {
      id: 'channels',
      title: 'Public Channels',
      icon: <Hash className="w-4 h-4" />,
      description: 'News channels, crypto updates, public broadcasts',
      examples: ['@news_channel', '@crypto_alerts', '@tech_updates'],
      steps: [
        `Go to the public channel (e.g., @news_channel)`,
        `Click the channel name at the top`,
        `Click "Administrators" or "Manage Channel"`,
        `Click "Add Administrator"`,
        `Search for "${botUsername || '@YourBot'}" and add it`,
        `Give it "Read Messages" permission`,
        `Click "Save" or "Done"`
      ],
      permissions: 'Administrator with "Read Messages" permission',
      identifier: 'Use @channelname format'
    },
    {
      id: 'groups',
      title: 'Groups & Supergroups',
      icon: <Users className="w-4 h-4" />,
      description: 'Discussion groups, community chats, private groups',
      examples: ['-1001234567890', '@public_group'],
      steps: [
        `Go to the group you want to monitor`,
        `Click the group name at the top`,
        `Click "Add Members" or group info`,
        `Search for "${botUsername || '@YourBot'}" and add it`,
        `The bot is now a regular member`,
        `Get the group ID using the method below`
      ],
      permissions: 'Regular member (no special permissions needed)',
      identifier: 'Use -1001234567890 format (negative number)'
    },
    {
      id: 'private',
      title: 'Private Channels',
      icon: <Bot className="w-4 h-4" />,
      description: 'Private channels where you have admin access',
      examples: ['123456789', 'Numeric channel ID'],
      steps: [
        `You must be an admin of the private channel`,
        `Add your bot as administrator`,
        `Give it "Read Messages" permission`,
        `Get the channel ID using the method below`,
        `Use the positive numeric ID`
      ],
      permissions: 'Administrator with "Read Messages" permission',
      identifier: 'Use positive numeric channel ID'
    }
  ];

  const getChannelIdSteps = [
    `Add your bot to the channel/group first`,
    `Send any message in the channel/group (like "test")`,
    `Open this URL in browser: https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`,
    `Look for "chat":{"id": -1234567890} in the JSON response`,
    `Use that number as the channel identifier`
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ExternalLink className="w-5 h-5" />
          How to Add Channels/Groups for Monitoring
        </CardTitle>
        <CardDescription>
          Step-by-step guide to set up your bot in different types of Telegram channels and groups
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Warning */}
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <h4 className="font-medium text-red-800 dark:text-red-200 mb-1">
                ⚠️ CRITICAL: Add Bot to Telegram First!
              </h4>
              <p className="text-red-700 dark:text-red-300 text-xs">
                You MUST add your bot (@{botUsername || 'YourBot'}) to each Telegram channel/group 
                <strong> BEFORE</strong> adding it to monitoring in Synapse. Otherwise, you'll see 0 messages.
              </p>
            </div>
          </div>
        </div>

        {/* Channel Types */}
        <div className="space-y-3">
          {sections.map((section) => (
            <div key={section.id} className="border rounded-lg">
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1 bg-blue-100 dark:bg-blue-900 rounded">
                    {section.icon}
                  </div>
                  <div className="text-left">
                    <h3 className="font-medium">{section.title}</h3>
                    <p className="text-xs text-muted-foreground">{section.description}</p>
                  </div>
                </div>
                {expandedSection === section.id ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
              
              {expandedSection === section.id && (
                <div className="border-t p-4 space-y-4 bg-muted/20">
                  {/* Examples */}
                  <div>
                    <h4 className="font-medium text-sm mb-2">📝 Examples:</h4>
                    <div className="flex flex-wrap gap-2">
                      {section.examples.map((example, index) => (
                        <div key={index} className="flex items-center gap-1">
                          <Badge variant="outline" className="font-mono text-xs">
                            {example}
                          </Badge>
                          <button
                            onClick={() => copyToClipboard(example, `Example ${index + 1}`)}
                            className="p-1 hover:bg-muted rounded"
                          >
                            {copiedText === `Example ${index + 1}` ? (
                              <Check className="w-3 h-3 text-green-600" />
                            ) : (
                              <Copy className="w-3 h-3 text-muted-foreground" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Steps */}
                  <div>
                    <h4 className="font-medium text-sm mb-2">🔧 Setup Steps:</h4>
                    <ol className="space-y-1 text-xs text-muted-foreground">
                      {section.steps.map((step, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-medium flex-shrink-0 mt-0.5">
                            {index + 1}
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                  
                  {/* Requirements */}
                  <div className="grid md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <h5 className="font-medium text-foreground mb-1">🔑 Required Permissions:</h5>
                      <p className="text-muted-foreground">{section.permissions}</p>
                    </div>
                    <div>
                      <h5 className="font-medium text-foreground mb-1">🆔 Identifier Format:</h5>
                      <p className="text-muted-foreground">{section.identifier}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* How to Get Channel ID */}
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h4 className="font-medium text-sm mb-3 text-blue-800 dark:text-blue-200 flex items-center gap-2">
            <Hash className="w-4 h-4" />
            🔍 How to Find Channel/Group ID (for private channels & groups):
          </h4>
          <ol className="space-y-2 text-xs text-blue-700 dark:text-blue-300">
            {getChannelIdSteps.map((step, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-300 rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-medium flex-shrink-0 mt-0.5">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          
          <div className="mt-3 p-2 bg-blue-100 dark:bg-blue-900 rounded border">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              <strong>💡 Tip:</strong> Replace &lt;YOUR_BOT_TOKEN&gt; with your actual bot token from BotFather. 
              The response will show recent messages and their chat IDs.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-center pt-4">
          <AnimatedButton onClick={onAddChannel} className="flex items-center gap-2">
            <ExternalLink className="w-4 h-4" />
            Ready? Add Channel to Monitoring
          </AnimatedButton>
        </div>
        
        {/* Quick Reference */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
          <h4 className="font-medium text-sm mb-2">📋 Quick Reference:</h4>
          <div className="grid md:grid-cols-3 gap-3 text-xs">
            <div>
              <div className="font-medium text-green-600 dark:text-green-400">✅ Public Channel</div>
              <div className="text-muted-foreground">@channelname → Add as admin</div>
            </div>
            <div>
              <div className="font-medium text-blue-600 dark:text-blue-400">✅ Public Group</div>
              <div className="text-muted-foreground">@groupname or -ID → Add as member</div>
            </div>
            <div>
              <div className="font-medium text-purple-600 dark:text-purple-400">✅ Private</div>
              <div className="text-muted-foreground">Numeric ID → Add as admin</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChannelSetupGuide;