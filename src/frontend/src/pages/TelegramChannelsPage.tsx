import React, { useState, useEffect } from 'react';
import { Plus, Search, Settings, RefreshCw, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AddChannelModal from '@/components/telegram/AddChannelModal';
import ChannelMessagesView from '@/components/telegram/ChannelMessagesView';
import { useTelegramChannels } from '@/contexts/TelegramChannelsContext';

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
  
  const [selectedChannel, setSelectedChannel] = useState<TelegramChannel | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Telegram Channels</h1>
          <p className="text-muted-foreground">
            Monitor public Telegram channels and groups for relevant content
          </p>
        </div>
        
        <div className="flex gap-2 mt-4 md:mt-0">
          <AnimatedButton
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Channel
          </AnimatedButton>
          
          <AnimatedButton
            variant="outline"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="w-4 h-4" />
          </AnimatedButton>
        </div>
      </div>

      <Tabs defaultValue="channels" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="channels">Channels ({channels.length})</TabsTrigger>
          <TabsTrigger value="search">Search Messages</TabsTrigger>
        </TabsList>

        <TabsContent value="channels" className="space-y-4">
          {channels.length === 0 ? (
            <div className="space-y-6">
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="text-center">
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
                  </div>
                </CardContent>
              </Card>

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
                      <ol className="text-xs text-muted-foreground space-y-1 pl-4">
                        <li>1. Go to your target channel/group</li>
                        <li>2. Tap channel name → Administrators</li>
                        <li>3. Add Administrator → Search your bot</li>
                        <li>4. Grant "Post Messages" permission</li>
                      </ol>
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
      </Tabs>

      {/* Modals */}
      <AddChannelModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddChannel}
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
