import React from 'react';
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
import { ExternalLink, Trash2, Brain, PlayCircle, StopCircle, AlertCircle, Loader2, CheckCircle, XCircle } from 'lucide-react';

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
  const formattedDate = new Date(bookmark.createdAt).toLocaleString(undefined, {
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  const currentSummaryStatus = bookmark.status;
  const currentSummaryText = bookmark.summary;

  const displayTitle = bookmark.fetchedTitle || `Reddit Post: ${bookmark.originalUrl.substring(0, 70)}...`;

  return (
    <Card className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 h-full relative group">
      <CardHeader className="flex-grow p-4">
        <div className="flex justify-between items-start">
          <CardTitle className="text-base font-semibold leading-tight mb-1 flex items-center flex-grow mr-2">
            <RedditIcon className="w-5 h-5 mr-2 text-orange-600 shrink-0" />
            <a
              href={bookmark.originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline group-hover:text-primary transition-colors duration-200"
              title={bookmark.fetchedTitle || bookmark.originalUrl}
            >
              <span className="line-clamp-3">
                {displayTitle}
              </span>
            </a>
          </CardTitle>
        </div>
        {bookmark.fetchedDescription && (
          <CardDescription className="text-sm text-muted-foreground line-clamp-4 mt-1">
            {bookmark.fetchedDescription}
          </CardDescription>
        )}
      </CardHeader>

      {(bookmark.fetchedImageUrl || bookmark.fetchedVideoUrl) && (
        <CardContent className="p-4 pt-0">
          {bookmark.fetchedImageUrl && !bookmark.fetchedVideoUrl && (
            <img
              src={bookmark.fetchedImageUrl}
              alt={`Preview for ${displayTitle}`}
              className="w-full max-h-80 object-contain rounded-md border"
            />
          )}
          {bookmark.fetchedVideoUrl && (
            <video
              src={bookmark.fetchedVideoUrl}
              controls
              playsInline
              className="w-full max-h-80 rounded-md border bg-black"
              poster={bookmark.fetchedImageUrl}
            >
              Your browser does not support the video tag.
            </video>
          )}
        </CardContent>
      )}

      {currentSummaryStatus === 'summarized' && currentSummaryText && (
        <CardContent className="p-4 pt-2 text-sm text-muted-foreground/90">
          <details>
            <summary className="cursor-pointer font-medium text-primary/80 hover:text-primary select-none">View Summary</summary>
            <p className="pt-2 whitespace-pre-wrap">{currentSummaryText}</p>
          </details>
        </CardContent>
      )}
      {currentSummaryStatus === 'pending' && <p className="px-4 pb-2 text-xs text-amber-500">Summary pending...</p>}
      {currentSummaryStatus === 'error' && <p className="px-4 pb-2 text-xs text-destructive">Summary failed.</p>}
      {currentSummaryStatus === 'processing' && (
        <div className="px-4 pb-2 flex items-center text-xs text-sky-500">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          <span>Processing summary...</span>
        </div>
      )}

      <CardFooter className="p-4 pt-2 border-t mt-auto flex flex-col items-stretch gap-2">
        <div className="flex justify-between items-center w-full">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(bookmark.originalUrl, '_blank')}
            title="View on Reddit"
            className="text-xs"
          >
            <ExternalLink className="w-4 h-4 mr-1" /> View Post
          </Button>

          <div className="flex space-x-1">
            {onSummarize && (
              <Button
                variant="outline"
                size="icon"
                onClick={(e) => { e.stopPropagation(); onSummarize(bookmark._id); }}
                disabled={isSummarizing || currentSummaryStatus === 'summarized' || currentSummaryStatus === 'processing'}
                title={                  currentSummaryStatus === 'summarized' ? "Already Summarized" :                  currentSummaryStatus === 'pending' ? "Summary Pending" :                  currentSummaryStatus === 'processing' ? "Processing Summary" :                  "Summarize Content"                }
              >
                {isSummarizing && summarizingBookmarkId === bookmark._id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : currentSummaryStatus === 'summarized' ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : currentSummaryStatus === 'error' ? (
                  <XCircle className="w-4 h-4 text-destructive" />
                ) : (
                  <Brain className="w-4 h-4" />
                )}
              </Button>
            )}
            {onSpeakSummary && currentSummaryStatus === 'summarized' && currentSummaryText && (
              <Button
                variant="outline"
                size="icon"
                onClick={(e) => { e.stopPropagation(); onSpeakSummary(bookmark._id, currentSummaryText); }}
                disabled={!currentSummaryText}
                title={audioErrorId === bookmark._id ? "Audio Error" : (playingBookmarkId === bookmark._id ? "Stop Speaking" : "Speak Summary")}
                className={`${audioErrorId === bookmark._id ? 'text-destructive' : ''}`}
              >
                {playingBookmarkId === bookmark._id ? (
                  <StopCircle className="w-4 h-4" />
                ) : audioErrorId === bookmark._id ? (
                  <AlertCircle className="w-4 h-4" />
                ) : (
                  <PlayCircle className="w-4 h-4" />
                )}
              </Button>
            )}
            <Button
              variant="destructive"
              size="icon"
              onClick={(e) => { e.stopPropagation(); onDelete(bookmark._id); }}
              title="Delete Bookmark"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-right w-full mt-1">
            Saved: {formattedDate}
        </p>
      </CardFooter>
    </Card>
  );
};

export default RedditCard;
