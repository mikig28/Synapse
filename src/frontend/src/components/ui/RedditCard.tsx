import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BookmarkItemType } from '@/types/bookmark';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Trash2, Brain, PlayCircle, StopCircle, AlertCircle, Loader2, CheckCircle, XCircle, ArrowUp, MessageCircle, Calendar, FileText, Zap, Volume2 } from 'lucide-react';
import { timeAgo } from '@/utils/time-ago';
import { ExpandableContent } from './ExpandableContent';

// Define a simple RedditIcon here for now if not available globally
// You might want to move this to a shared CustomIcons.tsx file
const RedditIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm6.224 13.871c-.208.626-.925.826-1.427.418-.991-.806-2.479-1.305-4.032-1.305s-3.04.499-4.032 1.305c-.502.408-1.219.208-1.427-.418-.208-.626.036-1.33.538-1.738 1.305-1.05 3.147-1.666 5.003-1.666s3.699.616 5.003 1.666c.502.408.746 1.112.538 1.738zm-2.29-4.899c-.783 0-1.416.633-1.416 1.416s.633 1.416 1.416 1.416 1.416-.633 1.416-1.416-.633-1.416-1.416-1.416zm-7.868 0c-.783 0-1.416.633-1.416 1.416s.633 1.416 1.416 1.416 1.416-.633 1.416-1.416-.633-1.416-1.416-1.416zm7.004 7.352c-.647 0-1.173.526-1.173 1.173s.526 1.173 1.173 1.173 1.173-.526 1.173-1.173-.526-1.173-1.173-1.173zm-6.14 0c-.647 0-1.173.526-1.173 1.173s.526 1.173 1.173 1.173 1.173-.526 1.173-1.173-.526-1.173-1.173-1.173z"/>
  </svg>
);

interface RedditCardProps {
  bookmark: BookmarkItemType;
  onDelete: (bookmarkId: string) => void;
  onSummarize?: (bookmarkId: string) => void;
  isSummarizing?: boolean;
  summarizingBookmarkId?: string | null;
  onSpeakSummary?: (bookmarkId: string, summaryText: string | undefined) => void;
  playingBookmarkId?: string | null;
  audioErrorId?: string | null;
}

const RedditCard: React.FC<RedditCardProps> = ({
  bookmark,
  onDelete,
  onSummarize,
  isSummarizing,
  summarizingBookmarkId,
  onSpeakSummary,
  playingBookmarkId,
  audioErrorId,
}) => {
  const {
    _id,
    fetchedTitle,
    fetchedImageUrl,
    fetchedVideoUrl,
    originalUrl,
    summary,
    status,
    redditPostContent,
    redditAuthor,
    redditSubreddit,
    redditUpvotes,
    redditNumComments,
    redditCreatedUtc,
  } = bookmark;

  const postDate = redditCreatedUtc ? new Date(redditCreatedUtc * 1000) : new Date(bookmark.createdAt);

  const formattedDate = new Date(bookmark.createdAt).toLocaleString(undefined, {
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  const currentSummaryStatus = status;
  const currentSummaryText = summary;

  const displayTitle = fetchedTitle || `Reddit Post: ${originalUrl.substring(0, 70)}...`;

  // Format Reddit timestamp if available
  const formatRedditTimestamp = (utc?: number) => {
    if (!utc) return null;
    return new Date(utc * 1000).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Card className="not-prose rounded-lg border border-border bg-card text-card-foreground p-4 mb-2 max-w-full relative group transition-shadow hover:shadow-lg">
      <CardHeader className="p-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg font-semibold leading-tight">{displayTitle}</CardTitle>
            <div className="text-xs text-muted-foreground mt-1">
              {redditSubreddit && (
                <span>Posted in r/{redditSubreddit}</span>
              )}
              {redditAuthor && (
                <span>by u/{redditAuthor}</span>
              )}
              {redditCreatedUtc && (
                <span className="mx-1">•</span>
              )}
              {redditCreatedUtc && (
                <span>{formatRedditTimestamp(redditCreatedUtc)}</span>
              )}
            </div>
          </div>
          <a href={originalUrl} target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-600">
            <ExternalLink className="w-5 h-5" />
          </a>
        </div>
      </CardHeader>
      <CardContent className="p-2">
        {fetchedVideoUrl ? (
          <video src={fetchedVideoUrl} controls className="rounded-lg w-full h-auto" />
        ) : fetchedImageUrl && (
          <img src={fetchedImageUrl} alt={displayTitle} className="rounded-lg w-full h-auto object-cover max-h-96" />
        )}
        {redditPostContent && (
          <div className="prose prose-sm dark:prose-invert max-w-none mt-4 text-foreground/80">
            <ExpandableContent content={redditPostContent} maxLength={300} isMarkdown />
          </div>
        )}
        {summary && (
          <div className="mt-4 p-3 bg-secondary/50 rounded-lg border border-secondary">
            <h4 className="font-semibold text-base mb-2 flex items-center">
              <Zap className="w-4 h-4 mr-2 text-primary" />
              Summary
            </h4>
            <ExpandableContent content={summary} />
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onSpeakSummary(_id, summary); }}
              disabled={playingBookmarkId === _id}
              className="mt-2 text-xs"
            >
              <Volume2 className={`w-4 h-4 mr-1 ${playingBookmarkId === _id ? 'animate-pulse text-green-500' : ''} ${audioErrorId === _id ? 'text-red-500' : ''}`} />
              {playingBookmarkId === _id ? 'Playing...' : 'Read Aloud'}
            </Button>
          </div>
        )}
      </CardContent>
      <CardFooter className="p-2 flex justify-between items-center text-muted-foreground">
        <div className="flex items-center space-x-4 text-xs">
          {redditUpvotes !== undefined && (
            <span className="flex items-center">
              <ArrowUp className="w-4 h-4 mr-1" />
              {redditUpvotes.toLocaleString()} upvotes
            </span>
          )}
          {redditNumComments !== undefined && (
            <span className="flex items-center">
              <MessageCircle className="w-4 h-4 mr-1" />
              {redditNumComments.toLocaleString()} comments
            </span>
          )}
        </div>
        <div className="absolute bottom-2 right-2 z-10 flex space-x-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onSummarize(_id);
            }}
            disabled={isSummarizing || currentSummaryStatus === 'summarized'}
            title={currentSummaryStatus === 'summarized' ? "Already Summarized" : currentSummaryStatus === 'pending' ? "Summary Pending" : "Summarize Content"}
            className="text-xs"
          >
            {isSummarizing && summarizingBookmarkId === _id ? (
              <><Zap className="w-4 h-4 mr-1 animate-pulse" /> Summarizing...</>
            ) : currentSummaryStatus === 'summarized' ? (
              <><FileText className="w-4 h-4 mr-1" /> Summarized</>
            ) : currentSummaryStatus === 'pending' ? (
              <><FileText className="w-4 h-4 mr-1" /> Pending</>
            ) : (
              <><FileText className="w-4 h-4 mr-1" /> Summarize</>
            )}
          </Button>
          <Button
            variant="destructive"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(_id);
            }}
            title="Delete Bookmark"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default RedditCard;
