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
import { timeAgo } from '@/utils/time-ago';

interface LinkedInCardProps {
  bookmark: BookmarkItemType;
  onDelete: (bookmarkId: string) => void;
  onSummarize?: (bookmarkId: string) => void;
  isSummarizing?: boolean;
  summarizingBookmarkId?: string | null;
  onSpeakSummary?: (bookmarkId: string, summaryText: string | undefined) => void;
  playingBookmarkId?: string | null;
  audioErrorId?: string | null;
}

const LinkedInCard: React.FC<LinkedInCardProps> = ({
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
    fetchedDescription,
    fetchedImageUrl,
    originalUrl,
    summary,
    status,
  } = bookmark;

  const formattedDate = new Date(bookmark.createdAt).toLocaleString(undefined, { 
      year: 'numeric', month: 'numeric', day: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
  });

  const currentSummaryStatus = status;
  const currentSummaryText = summary;

  return (
    <Card className="not-prose rounded-lg border border-border bg-card text-card-foreground p-4 mb-2 max-w-full relative group transition-shadow hover:shadow-lg">
      <CardHeader className="p-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg font-semibold leading-tight">{fetchedTitle || 'LinkedIn Post'}</CardTitle>
          <a href={originalUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600">
            <ExternalLink className="w-5 h-5" />
          </a>
        </div>
      </CardHeader>
      <CardContent className="p-2">
        {fetchedImageUrl && (
          <div className="mb-4">
            <img src={fetchedImageUrl} alt={fetchedTitle || 'LinkedIn Image'} className="rounded-lg w-full h-auto object-cover" />
          </div>
        )}
        <CardDescription className="text-sm text-foreground/80 leading-relaxed">
          {fetchedDescription || 'No description available.'}
        </CardDescription>
        {summary && (
          <div className="mt-4 p-3 bg-secondary/50 rounded-lg border border-secondary">
            <h4 className="font-semibold text-base mb-2 flex items-center">
              <Zap className="w-4 h-4 mr-2 text-primary" />
              Summary
            </h4>
            <p className="text-sm text-foreground/90 whitespace-pre-wrap">{summary}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onSpeakSummary?.(_id, summary);
              }}
              disabled={playingBookmarkId === _id}
              className="mt-2 text-xs"
            >
              <Volume2 className={`w-4 h-4 mr-1 ${playingBookmarkId === _id ? 'animate-pulse text-green-500' : ''} ${audioErrorId === _id ? 'text-red-500' : ''}`} />
              {playingBookmarkId === _id ? 'Playing...' : 'Read Aloud'}
            </Button>
          </div>
        )}
      </CardContent>
      <CardFooter className="p-2 flex justify-end">
        <div className="absolute bottom-2 right-2 z-10 flex space-x-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onSummarize?.(_id);
            }}
            disabled={isSummarizing || currentSummaryStatus === 'summarized'}
            title={currentSummaryStatus === 'summarized' ? "Already Summarized" : currentSummaryStatus === 'pending' ? "Pending" : "Summarize Content"}
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

export default LinkedInCard;
