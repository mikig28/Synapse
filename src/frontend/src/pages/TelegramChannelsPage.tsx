import React, { useState, useEffect } from 'react';
import { Plus, Search, Settings, RefreshCw, Trash2, ToggleLeft, ToggleRight, Bot, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AddChannelModal from '@/components/telegram/AddChannelModal';
import ChannelMessagesView from '@/components/telegram/ChannelMessagesView';
import BotConfigurationModal from '@/components/telegram/BotConfigurationModal';
import QuickDiagnostics from '@/components/telegram/QuickDiagnostics';
import ChannelSetupGuide from '@/components/telegram/ChannelSetupGuide';
import BotSetupVerification from '@/components/telegram/BotSetupVerification';
import BotAdditionGuide from '@/components/telegram/BotAdditionGuide';
import { useTelegramChannels } from '@/contexts/TelegramChannelsContext';
import { useTelegramBot } from '@/hooks/useTelegramBot';
import { useToast } from '@/hooks/use-toast';

interface TelegramChannelMessage {
  messageId: number;
  text?: string;
  mediaType?: 'photo' | 'video' | 'document' | 'audio' | 'voice' | 'sticker';
  mediaUrl?: string;
  author?: string;
  date: string;
  views?: number;
  forwards?: number;
  urls?: string[];
  hashtags?: string[];
}

interface TelegramChannel {
  _id: string;
  channelId: string;
  channelTitle: string;
  channelUsername?: string;
  channelDescription?: string;
  channelType: 'channel' | 'group' | 'supergroup';
  isActive: boolean;
  totalMessages: number;
  messages: TelegramChannelMessage[];
  keywords: string[];
  fetchInterval: number;
  lastFetchedAt?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

const TelegramChannelsPage: React.FC = () => {
  const {
    channels,
    isConnected,
    addChannel,
    removeChannel,
    toggleChannelStatus,
    forceChannelFetch,
    searchChannelMessages,
    isLoading
  } = useTelegramChannels();
  
  const {
    botStatus,
    isLoading: isBotLoading,
    refreshBotStatus,
    removeBotConfiguration
  } = useTelegramBot();
  
  const [selectedChannel, setSelectedChannel] = useState<TelegramChannel | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBotConfigOpen, setIsBotConfigOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  // Search messages when query changes
  useEffect(() => {
    if (searchQuery.length > 2) {
      searchMessages();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const searchMessages = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      setIsSearching(true);
      const results = await searchChannelMessages(searchQuery);
      setSearchResults(results);
    } catch (error) {
      // Error is handled by context
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddChannel = async (channelData: { channelIdentifier: string; keywords: string[] }) => {
    // Prevent adding channels if bot is not configured
    if (!botStatus?.hasBot) {
      setIsBotConfigOpen(true);
      return;
    }

    try {
      await addChannel(channelData);
      setIsAddModalOpen(false);
    } catch (error) {
      // Error is handled by context
    }
  };

  const handleToggleChannelStatus = async (channelId: string, currentStatus: boolean) => {
    try {
      await toggleChannelStatus(channelId, !currentStatus);
    } catch (error) {
      // Error is handled by context
    }
  };

  const handleRemoveChannel = async (channelId: string) => {
    if (!confirm('Are you sure you want to remove this channel from monitoring?')) {
      return;
    }

    try {
      await removeChannel(channelId);
      if (selectedChannel?._id === channelId) {
        setSelectedChannel(null);
      }
    } catch (error) {
      // Error is handled by context
    }
  };

  const handleForceChannelFetch = async (channelId: string) => {
    try {
      await forceChannelFetch(channelId);
    } catch (error) {
      // Error is handled by context
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getChannelTypeColor = (type: string) => {
    switch (type) {
      case 'channel': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'group': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'supergroup': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Loading channels...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Alert for bot not active */}
      {botStatus?.hasBot && !botStatus?.isActive && (
        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-1">
                Bot Configured But Not Active
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-300 mb-2">
                Your bot is configured but not currently active. This might be due to server restart or token validation issues.
              </p>
              <AnimatedButton
                onClick={() => window.location.reload()}
                size="sm"
                className="bg-amber-600 hover:bg-amber-700"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Page
              </AnimatedButton>
            </div>
          </div>
        </div>
      )}

      {/* Alert for 0 messages issue */}
      {botStatus?.hasBot && botStatus?.isActive && channels.length > 0 && channels.every(c => c.totalMessages === 0) && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-800 dark:text-red-200 mb-1">
                No Messages Received - Action Required
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300 mb-2">
                Your bot is configured but no messages are appearing. This usually means your bot hasn't been added to the channels/groups yet.
              </p>
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                → Go to your Telegram channels/groups → Add @{botStatus.botUsername || 'yourbot'} as admin/member → Send test message
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Telegram Channels</h1>
          <p className="text-muted-foreground">
            Monitor public Telegram channels and groups for relevant content
          </p>
        </div>
        
        <div className="flex gap-2 mt-4 md:mt-0">
          {/* Always show Add Channel button */}
          <AnimatedButton
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2"
            title="Add a channel to monitor"
          >
            <Plus className="w-4 h-4" />
            Add Channel
          </AnimatedButton>
          
          {/* Show Configure Bot button if needed */}
          {!botStatus?.hasBot && (
            <AnimatedButton
              onClick={() => setIsBotConfigOpen(true)}
              className="flex items-center gap-2"
              variant="outline"
            >
              <Bot className="w-4 h-4" />
              Configure Bot
            </AnimatedButton>
          )}
          
          <AnimatedButton
            variant="outline"
            onClick={() => window.location.reload()}
            title="Refresh page"
          >
            <RefreshCw className="w-4 h-4" />
          </AnimatedButton>
        </div>
      </div>

      {/* Bot Status Section */}
      {!isBotLoading && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bot className="w-5 h-5" />
              Telegram Bot Status
            </CardTitle>
            <CardDescription>
              Your personal bot configuration for monitoring channels
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!botStatus?.hasBot ? (
              <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <div>
                    <h4 className="font-medium text-amber-800 dark:text-amber-200">
                      Bot Configuration Required
                    </h4>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      You need to configure your personal Telegram bot before you can monitor channels
                    </p>
                  </div>
                </div>
                <AnimatedButton
                  onClick={() => setIsBotConfigOpen(true)}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  <Bot className="w-4 h-4 mr-2" />
                  Configure Bot
                </AnimatedButton>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">Bot Status</p>
                    <p className={`text-xs ${botStatus.isActive ? 'text-green-600' : 'text-red-600'}`}>
                      {botStatus.isActive ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Bot className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium">Bot Username</p>
                    <p className="text-xs font-mono text-muted-foreground">
                      @{botStatus.botUsername || 'Unknown'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Search className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium">Monitored Chats</p>
                    <p className="text-xs text-muted-foreground">
                      {botStatus.monitoredChats} active
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <AnimatedButton
                    variant="outline"
                    size="sm"
                    onClick={() => setIsBotConfigOpen(true)}
                  >
                    <Settings className="w-4 h-4 mr-1" />
                    Manage Bot
                  </AnimatedButton>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions Bar */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-blue-200 dark:border-blue-800">
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <h3 className="font-semibold text-foreground">Quick Actions</h3>
              <p className="text-sm text-muted-foreground">
                Add channels/groups to monitor or configure your bot
              </p>
            </div>
            <div className="flex gap-3">
              <AnimatedButton
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2"
                size="lg"
              >
                <Plus className="w-4 h-4" />
                Add Channel/Group
              </AnimatedButton>
              
              {!botStatus?.hasBot && (
                <AnimatedButton
                  onClick={() => setIsBotConfigOpen(true)}
                  variant="outline"
                  className="flex items-center gap-2"
                  size="lg"
                >
                  <Bot className="w-4 h-4" />
                  Setup Bot
                </AnimatedButton>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bot Setup Verification - Show when bot is configured */}
      {botStatus?.hasBot && (
        <BotSetupVerification 
          botStatus={botStatus}
          channels={channels}
          onRefresh={() => {
            refreshBotStatus();
            window.location.reload();
          }}
        />
      )}

      {/* Bot Addition Guide - Show when channels need setup */}
      {botStatus?.hasBot && channels.length > 0 && channels.some(c => c.totalMessages === 0) && (
        <BotAdditionGuide
          botUsername={botStatus.botUsername}
          channels={channels}
          onRefresh={() => {
            refreshBotStatus();
            window.location.reload();
          }}
        />
      )}

      <Tabs defaultValue="channels" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="channels">Channels ({channels.length})</TabsTrigger>
          <TabsTrigger value="search">Search Messages</TabsTrigger>
          <TabsTrigger value="setup">Setup Guide</TabsTrigger>
        </TabsList>

        <TabsContent value="channels" className="space-y-4">
          {channels.length === 0 ? (
            <div className="space-y-6">
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="text-center">
                    {!botStatus?.hasBot ? (
                      <>
                        <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-foreground mb-2">
                          Configure Your Bot First
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          You need to set up your personal Telegram bot before you can monitor channels
                        </p>
                        <AnimatedButton onClick={() => setIsBotConfigOpen(true)}>
                          <Bot className="w-4 h-4 mr-2" />
                          Configure Bot
                        </AnimatedButton>
                      </>
                    ) : (
                      <>
                        <Plus className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-foreground mb-2">
                          No channels added yet
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          Add your first Telegram channel to start monitoring
                        </p>
                        <AnimatedButton onClick={() => setIsAddModalOpen(true)}>
                          <Plus className="w-4 h-4 mr-2" />
                          Add Channel
                        </AnimatedButton>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Setup Guide - Show when bot is configured but no channels */}
              {botStatus?.hasBot && (
                <ChannelSetupGuide 
                  botUsername={botStatus.botUsername}
                  onAddChannel={() => setIsAddModalOpen(true)}
                />
              )}

              {/* Setup Guide */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Setup Guide
                  </CardTitle>
                  <CardDescription>
                    Follow these steps to properly set up channel monitoring
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">🤖 Step 1: Find Your Bot</h4>
                      <ol className="text-xs text-muted-foreground space-y-1 pl-4">
                        <li>1. Go to @BotFather on Telegram</li>
                        <li>2. Send /mybots to see your bots</li>
                        <li>3. Find the bot used by this app</li>
                        <li>4. Copy the bot username (e.g., @YourBot)</li>
                      </ol>
                    </div>
                    
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">📢 Step 2: Add Bot to Channel</h4>
                      <div className="text-xs text-muted-foreground space-y-2">
                        <div>
                          <strong>For Groups:</strong>
                          <ol className="pl-4 space-y-1 mt-1">
                            <li>1. Go to your target group</li>
                            <li>2. Add members → Search your bot</li>
                            <li>3. Add bot as regular member</li>
                          </ol>
                        </div>
                        <div>
                          <strong>For Channels (Optional):</strong>
                          <ol className="pl-4 space-y-1 mt-1">
                            <li>1. Add bot as admin (best option)</li>
                            <li>2. OR skip - system will try RSS feeds</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">✅ Step 3: Add Channel Here</h4>
                      <ol className="text-xs text-muted-foreground space-y-1 pl-4">
                        <li>1. Click "Add Channel" above</li>
                        <li>2. Enter @channelname or group ID</li>
                        <li>3. Add optional keyword filters</li>
                        <li>4. Start monitoring!</li>
                      </ol>
                    </div>
                    
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">🔧 Troubleshooting</h4>
                      <ul className="text-xs text-muted-foreground space-y-1 pl-4">
                        <li>• No messages? Check bot permissions</li>
                        <li>• "Setup needed"? Bot isn't admin</li>
                        <li>• Only new messages are monitored</li>
                        <li>• Historical messages aren't available</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      <strong>⚠️ Important:</strong> Due to Telegram Bot API limitations, your bot must be added as an administrator 
                      to channels or as a member to groups <em>before</em> it can read messages. Historical messages cannot be accessed.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {channels.map((channel) => (
                <Card key={channel._id} className="cursor-pointer hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg line-clamp-2">
                          {channel.channelTitle}
                        </CardTitle>
                        {channel.channelUsername && (
                          <p className="text-sm text-muted-foreground">
                            @{channel.channelUsername}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge className={getChannelTypeColor(channel.channelType)}>
                          {channel.channelType}
                        </Badge>
                        
                        <button
                          onClick={() => handleToggleChannelStatus(channel._id, channel.isActive)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {channel.isActive ? (
                            <ToggleRight className="w-5 h-5 text-green-600" />
                          ) : (
                            <ToggleLeft className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{channel.totalMessages} messages</span>
                        {channel.lastFetchedAt && (
                          <span>Last: {formatDate(channel.lastFetchedAt)}</span>
                        )}
                      </div>
                      
                      {channel.lastError && (
                        <div className="bg-orange-50 dark:bg-orange-950 border-l-2 border-orange-400 p-2 rounded">
                          <p className="text-xs text-orange-700 dark:text-orange-300">
                            <strong>Setup needed:</strong> Bot requires permissions to read messages
                          </p>
                        </div>
                      )}
                      
                      {channel.totalMessages === 0 && !channel.lastError && (
                        <div className="bg-blue-50 dark:bg-blue-950 border-l-2 border-blue-400 p-2 rounded">
                          <p className="text-xs text-blue-700 dark:text-blue-300">
                            <strong>Waiting for messages:</strong> Make sure the bot is added to the channel/group
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {channel.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {channel.keywords.slice(0, 3).map((keyword, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                        {channel.keywords.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{channel.keywords.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <AnimatedButton
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedChannel(channel)}
                      >
                        View Messages
                      </AnimatedButton>
                      
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleForceChannelFetch(channel._id)}
                          className="p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted"
                          title="Force fetch new messages"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => handleRemoveChannel(channel._id)}
                          className="p-2 text-muted-foreground hover:text-destructive rounded-md hover:bg-muted"
                          title="Remove channel"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Search Channel Messages
              </CardTitle>
              <CardDescription>
                Search across all your monitored channels for specific content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
                <AnimatedButton
                  onClick={searchMessages}
                  disabled={!searchQuery.trim() || isSearching}
                  loading={isSearching}
                >
                  Search
                </AnimatedButton>
              </div>
              
              {searchResults.length > 0 && (
                <div className="mt-4 space-y-3">
                  <h4 className="font-medium">Search Results ({searchResults.length})</h4>
                  {searchResults.map((result, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <h5 className="font-medium text-sm">{result.channelTitle}</h5>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(result.message.date)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {result.message.text}
                      </p>
                      {result.message.hashtags && result.message.hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {result.message.hashtags.map((tag: string, tagIndex: number) => (
                            <Badge key={tagIndex} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {searchQuery.length > 2 && searchResults.length === 0 && !isSearching && (
                <div className="text-center py-8 text-muted-foreground">
                  No messages found for "{searchQuery}"
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="setup" className="space-y-4">
          {botStatus?.hasBot ? (
            <div className="space-y-6">
              {/* Comprehensive Bot Addition Guide */}
              {channels.some(c => c.totalMessages === 0) && (
                <BotAdditionGuide
                  botUsername={botStatus.botUsername}
                  channels={channels}
                  onRefresh={() => {
                    refreshBotStatus();
                    window.location.reload();
                  }}
                />
              )}
              
              {/* Original Setup Guide */}
              <ChannelSetupGuide 
                botUsername={botStatus.botUsername}
                onAddChannel={() => setIsAddModalOpen(true)}
              />
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Configure Your Bot First
                </h3>
                <p className="text-muted-foreground mb-4">
                  You need to set up your personal Telegram bot before you can use the setup guide
                </p>
                <AnimatedButton onClick={() => setIsBotConfigOpen(true)}>
                  <Bot className="w-4 h-4 mr-2" />
                  Configure Bot
                </AnimatedButton>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <BotConfigurationModal
        isOpen={isBotConfigOpen}
        onClose={() => setIsBotConfigOpen(false)}
        onSuccess={() => {
          refreshBotStatus();
          // Refresh channels after bot is configured
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }}
        currentBotInfo={botStatus || undefined}
      />

      <AddChannelModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddChannel}
        botStatus={botStatus}
      />

      {selectedChannel && (
        <ChannelMessagesView
          channel={selectedChannel}
          onClose={() => setSelectedChannel(null)}
        />
      )}
    </div>
  );
};

export default TelegramChannelsPage;
