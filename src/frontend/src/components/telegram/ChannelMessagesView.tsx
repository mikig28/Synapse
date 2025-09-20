import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Hash, Clock, Eye, Share, FileText, Image, Video, Music, File } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import axiosInstance from '@/services/axiosConfig';

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
  createdAt: string;
  updatedAt: string;
}

interface ChannelMessagesViewProps {
  channel: TelegramChannel;
  onClose: () => void;
}

const ChannelMessagesView: React.FC<ChannelMessagesViewProps> = ({ channel, onClose }) => {
  const [messages, setMessages] = useState<TelegramChannelMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    fetchMessages();
  }, [channel._id]);

  const fetchMessages = async (offsetValue = 0) => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/telegram-channels/${channel._id}`, {
        params: { offset: offsetValue, limit: 50 }
      });

      if (response.data.success) {
        const channelData = response.data.data;
        if (offsetValue === 0) {
          setMessages(channelData.messages || []);
        } else {
          setMessages(prev => [...prev, ...(channelData.messages || [])]);
        }
        setHasMore(channelData.pagination?.hasMore || false);
        setOffset(offsetValue + (channelData.messages?.length || 0));
      }
    } catch (error) {
      console.error('Error fetching channel messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchMessages(offset);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
  };

  const getMediaIcon = (mediaType: string) => {
    switch (mediaType) {
      case 'photo': return <Image className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      case 'audio': 
      case 'voice': return <Music className="w-4 h-4" />;
      case 'document': return <FileText className="w-4 h-4" />;
      default: return <File className="w-4 h-4" />;
    }
  };

  const getChannelTypeColor = (type: string) => {
    switch (type) {
      case 'channel': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'group': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'supergroup': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const openUrl = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-xl">{channel.channelTitle}</DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                {channel.channelUsername && (
                  <span className="text-sm text-muted-foreground">
                    @{channel.channelUsername}
                  </span>
                )}
                <Badge className={getChannelTypeColor(channel.channelType)}>
                  {channel.channelType}
                </Badge>
                {!channel.isActive && (
                  <Badge variant="outline" className="text-orange-600">
                    Inactive
                  </Badge>
                )}
              </div>
              
              {channel.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  <span className="text-xs text-muted-foreground">Filtering:</span>
                  {channel.keywords.map((keyword) => (
                    <Badge key={keyword} variant="secondary" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              )}
              
              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                <span>{channel.totalMessages} total messages</span>
                {channel.lastFetchedAt && (
                  <span>Last updated: {formatDate(channel.lastFetchedAt)}</span>
                )}
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="ml-4 p-2 hover:bg-muted rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </DialogHeader>

        <ScrollArea className="px-6 py-4 h-[70vh]">
          {loading && messages.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">Loading messages...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No messages yet</h3>
              <p className="text-sm">
                {channel.isActive 
                  ? "Messages will appear here as they're fetched from the channel."
                  : "This channel is inactive. Enable it to start collecting messages."
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div key={`${message.messageId}-${index}`} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {formatDate(message.date)}
                      
                      {message.author && (
                        <>
                          <span>•</span>
                          <span>{message.author}</span>
                        </>
                      )}
                      
                      {message.mediaType && (
                        <>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            {getMediaIcon(message.mediaType)}
                            <span className="capitalize">{message.mediaType}</span>
                          </div>
                        </>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {message.views !== undefined && (
                        <div className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {message.views.toLocaleString()}
                        </div>
                      )}
                      
                      {message.forwards !== undefined && message.forwards > 0 && (
                        <div className="flex items-center gap-1">
                          <Share className="w-3 h-3" />
                          {message.forwards.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {message.text && (
                    <div className="text-sm text-foreground mb-3 whitespace-pre-wrap">
                      {message.text}
                    </div>
                  )}
                  
                  {message.mediaUrl && (
                    <div className="mb-3">
                      <a
                        href={message.mediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        {getMediaIcon(message.mediaType || 'file')}
                        View {message.mediaType || 'media'}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                  
                  {(message.urls && message.urls.length > 0) && (
                    <div className="mb-3">
                      <p className="text-xs text-muted-foreground mb-1">Links:</p>
                      <div className="flex flex-wrap gap-2">
                        {message.urls.map((url, urlIndex) => (
                          <button
                            key={urlIndex}
                            onClick={() => openUrl(url)}
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" />
                            {url.length > 50 ? `${url.substring(0, 50)}...` : url}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {message.hashtags && message.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {message.hashtags.map((tag, tagIndex) => (
                        <Badge key={tagIndex} variant="outline" className="text-xs">
                          <Hash className="w-3 h-3 mr-1" />
                          {tag.replace('#', '')}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              {hasMore && (
                <div className="text-center py-4">
                  <AnimatedButton
                    variant="outline"
                    onClick={loadMore}
                    loading={loading}
                  >
                    Load More Messages
                  </AnimatedButton>
                </div>
              )}
              
              {!hasMore && messages.length > 0 && (
                <div className="text-center py-4 text-xs text-muted-foreground">
                  All messages loaded
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default ChannelMessagesView;
