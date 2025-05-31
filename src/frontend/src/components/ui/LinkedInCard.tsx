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
import { ExternalLink, Trash2, Briefcase, FileText, Zap, Volume2, PlayCircle, StopCircle, AlertCircle, Loader2, CheckCircle, XCircle, Brain } from 'lucide-react';

interface LinkedInCardProps {
  bookmark: BookmarkItemType;
  onDelete: (bookmarkId: string) => void;
  onSummarize?: (bookmarkId: string) => void;
  isSummarizing?: boolean;
  summaryStatus?: BookmarkItemType['status'];
  summaryText?: string; // This prop might not be directly used here if summary is part of bookmark object
  onSpeakSummary?: (bookmarkId: string, summaryText: string | undefined) => void;
  playingBookmarkId?: string | null;
  audioErrorId?: string | null;
}

const LinkedInCard: React.FC<LinkedInCardProps> = ({ 
  bookmark, 
  onDelete,
  onSummarize,
  isSummarizing,
  // summaryStatus, // This is now derived from bookmark.status
  // summaryText, // This is now derived from bookmark.summary
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

  return (
    <Card className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 h-full relative group">
      <CardHeader className="flex-grow p-4">
        <div className="flex justify-between items-start">
          <CardTitle className="text-base font-semibold leading-tight mb-1 flex items-center flex-grow mr-2">
              <Briefcase className="w-5 h-5 mr-2 text-blue-700 shrink-0" />
              <span className="line-clamp-2" title={bookmark.fetchedTitle || bookmark.originalUrl}>
                  {bookmark.fetchedTitle || 'LinkedIn Post'}
              </span>
          </CardTitle>
          {/* Action buttons will be moved to CardFooter or an overlay */}
        </div>
        {bookmark.fetchedDescription && (
          <CardDescription className="text-sm text-muted-foreground line-clamp-3 mt-1">
            {bookmark.fetchedDescription}
          </CardDescription>
        )}
      </CardHeader>
      
      {/* Optional: Display image if fetchedImageUrl exists */}
      {bookmark.fetchedImageUrl && (
        <div className="px-4">
          <img 
            src={bookmark.fetchedImageUrl}
            alt={`Preview for ${bookmark.fetchedTitle || 'LinkedIn Post'}`}
            className="w-full h-40 object-cover rounded-md"
          />
        </div>
      )}

      {/* Summary Section */}
      {currentSummaryStatus === 'summarized' && currentSummaryText && (
        <CardContent className="p-4 pt-2 text-sm text-muted-foreground/90">
          <details>
            <summary className="cursor-pointer font-medium text-primary/80 hover:text-primary select-none">View Summary</summary>
            <p className="pt-2 whitespace-pre-wrap">{currentSummaryText}</p>
          </details>
        </CardContent>
      )}
      {currentSummaryStatus === 'pending_summary' && <p className="px-4 pb-2 text-xs text-amber-500">Summary pending...</p>}
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
            title="View on LinkedIn"
            className="text-xs"
          >
            <ExternalLink className="w-4 h-4 mr-1" /> View Post
          </Button>
          
          <div className="flex space-x-1">
            {onSummarize && (
              <Button
                variant="outline"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onSummarize(bookmark._id);
                }}
                disabled={isSummarizing || currentSummaryStatus === 'summarized' || currentSummaryStatus === 'processing'}
                title={
                  currentSummaryStatus === 'summarized' ? "Already Summarized" :
                  currentSummaryStatus === 'pending_summary' ? "Summary Pending" :
                  currentSummaryStatus === 'processing' ? "Processing Summary" :
                  "Summarize Content"
                }
              >
                {isSummarizing && bookmark._id === (window as any).summarizingBookmarkIdForSpinner ? ( // A bit hacky, better to pass summarizing ID
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
                onClick={(e) => {
                  e.stopPropagation();
                  onSpeakSummary(bookmark._id, currentSummaryText);
                }}
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
              onClick={(e) => {
                e.stopPropagation();
                onDelete(bookmark._id);
              }}
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

export default LinkedInCard;
