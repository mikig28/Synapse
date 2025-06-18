import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Eye, 
  Forward, 
  ThumbsUp, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Clock,
  Users,
  Send,
  Hash
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Define the enhanced Telegram message type based on our backend structure
interface TelegramMessage {
  _id?: string;
  message_id: string;
  channel: string;
  channel_name: string;
  title: string;
  text: string;
  full_content: string;
  summary: string;
  timestamp: string;
  date: string;
  views: number;
  forwards: number;
  reactions: Record<string, number>;
  url?: string;
  external_url?: string;
  discussion_url?: string;
  source: string;
  source_type: string;
  content_type: string;
  simulated: boolean;
  is_forwarded: boolean;
  media_type: string;
  hashtags?: string[];
  engagement?: {
    comments?: number;
    score?: number;
  };
  channel_info?: {
    name: string;
    username: string;
    verified: boolean;
  };
  message_info?: {
    has_media: boolean;
    is_forwarded: boolean;
    engagement_stats: {
      views: number;
      forwards: number;
      reactions_count: number;
    };
  };
}

interface TelegramCardProps {
  message: TelegramMessage;
  className?: string;
  onDelete?: (messageId: string) => void;
  onViewExternal?: (url: string) => void;
}

const TelegramCard: React.FC<TelegramCardProps> = ({
  message,
  className,
  onDelete,
  onViewExternal
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFullContent, setShowFullContent] = useState(false);

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Get content type badge color
  const getContentTypeBadge = () => {
    const colors = {
      'breaking_news': 'bg-red-100 text-red-800 border-red-200',
      'market_analysis': 'bg-blue-100 text-blue-800 border-blue-200',
      'tech_discussion': 'bg-purple-100 text-purple-800 border-purple-200',
      'news_article': 'bg-green-100 text-green-800 border-green-200',
      'default': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    
    const colorClass = colors[message.content_type as keyof typeof colors] || colors.default;
    
    return (
      <Badge variant="outline" className={`text-xs ${colorClass}`}>
        {message.content_type?.replace('_', ' ') || 'Message'}
      </Badge>
    );
  };

  // Get source type badge
  const getSourceBadge = () => {
    const sourceLabels = {
      'telegram_rss': 'RSS Feed',
      'telegram_tech_news': 'Tech News',
      'telegram_simulated': 'Demo Content',
      'hacker_news_telegram': 'Hacker News'
    };
    
    return (
      <Badge variant="secondary" className="text-xs">
        {sourceLabels[message.source_type as keyof typeof sourceLabels] || message.source_type}
      </Badge>
    );
  };

  // Determine content to show (full or summary)
  const contentToShow = showFullContent ? message.full_content : message.summary;
  const shouldShowExpandButton = message.full_content && message.full_content.length > 200;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("telegram-card", className)}
    >
      <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50/30 to-transparent dark:from-blue-950/30">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              {/* Telegram icon */}
              <div className="p-2 bg-blue-500 rounded-full">
                <MessageSquare className="w-4 h-4 text-white" />
              </div>
              
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-blue-600 dark:text-blue-400">
                    {message.channel_info?.name || message.channel_name || message.channel}
                  </h4>
                  {message.channel_info?.verified && (
                    <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {formatTimeAgo(message.timestamp)}
                  {message.simulated && (
                    <Badge variant="outline" className="text-xs text-orange-600 border-orange-200">
                      Demo
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Source and content type badges */}
            <div className="flex flex-col gap-1 items-end">
              {getSourceBadge()}
              {getContentTypeBadge()}
            </div>
          </div>

          {/* Title */}
          {message.title && (
            <h3 className="text-lg font-semibold mb-3 line-clamp-2">
              {message.title}
            </h3>
          )}

          {/* Content */}
          <div className="mb-4">
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {showFullContent ? (
                  <div className="space-y-2">
                    {message.full_content.split('\n').map((paragraph, index) => (
                      paragraph.trim() && (
                        <p key={index} className="mb-2">{paragraph}</p>
                      )
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    {contentToShow || message.text}
                  </p>
                )}
              </div>
            </div>

            {/* Expand/Collapse button */}
            {shouldShowExpandButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFullContent(!showFullContent)}
                className="mt-2 text-xs text-blue-600 hover:text-blue-700 p-0 h-auto"
              >
                {showFullContent ? (
                  <>
                    <ChevronUp className="w-3 h-3 mr-1" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3 mr-1" />
                    Show full message
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Hashtags */}
          {message.hashtags && message.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-4">
              {message.hashtags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  <Hash className="w-3 h-3" />
                  {tag.replace('#', '')}
                </span>
              ))}
            </div>
          )}

          {/* Engagement Stats */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {message.views?.toLocaleString() || '0'} views
              </span>
              <span className="flex items-center gap-1">
                <Forward className="w-3 h-3" />
                {message.forwards?.toLocaleString() || '0'} forwards
              </span>
              {message.reactions && Object.keys(message.reactions).length > 0 && (
                <div className="flex items-center gap-1">
                  {Object.entries(message.reactions).slice(0, 3).map(([emoji, count]) => (
                    <span key={emoji} className="flex items-center gap-1">
                      <span>{emoji}</span>
                      <span>{count}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {message.external_url && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewExternal?.(message.external_url!)}
                  className="text-xs"
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Open
                </Button>
              )}
              {message.discussion_url && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewExternal?.(message.discussion_url!)}
                  className="text-xs"
                >
                  <Users className="w-3 h-3 mr-1" />
                  Discuss
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default TelegramCard;