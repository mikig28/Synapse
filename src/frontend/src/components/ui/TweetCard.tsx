"use client";

import React, { Suspense } from "react";
import {
  enrichTweet,
  type EnrichedTweet,
  type TweetProps,
  type TwitterComponents,
  useTweet,
} from "react-tweet";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Trash2, FileText, Zap, Volume2 } from "lucide-react";
import { BookmarkItemType } from "@/types/bookmark";

interface TwitterIconProps {
  className?: string;
  [key: string]: unknown;
}
const Twitter = ({ className, ...props }: TwitterIconProps) => (
  <svg
    stroke="currentColor"
    fill="currentColor"
    strokeWidth="0"
    viewBox="0 0 24 24"
    height="1em"
    width="1em"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <g>
      <path fill="none" d="M0 0h24v24H0z"></path>
      <path d="M22.162 5.656a8.384 8.384 0 0 1-2.402.658A4.196 4.196 0 0 0 21.6 4c-.82.488-1.719.83-2.656 1.015a4.182 4.182 0 0 0-7.126 3.814 11.874 11.874 0 0 1-8.62-4.37 4.168 4.168 0 0 0-.566 2.103c0 1.45.738 2.731 1.86 3.481a4.168 4.168 0 0 1-1.894-.523v.052a4.185 4.185 0 0 0 3.355 4.101 4.21 4.21 0 0 1-1.89.072A4.185 4.185 0 0 0 7.97 16.65a8.394 8.394 0 0 1-6.191 1.732 11.83 11.83 0 0 0 6.41 1.88c7.693 0 11.9-6.373 11.9-11.9 0-.18-.005-.362-.013-.54a8.496 8.496 0 0 0 2.087-2.165z"></path>
    </g>
  </svg>
);

const Verified = ({ className, ...props }: TwitterIconProps) => (
  <svg
    aria-label="Verified Account"
    viewBox="0 0 24 24"
    className={className}
    {...props}
  >
    <g fill="currentColor">
      <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" />
    </g>
  </svg>
);

export const truncate = (str: string | null, length: number) => {
  if (!str || str.length <= length) return str;
  return `${str.slice(0, length - 3)}...`;
};

const Skeleton = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div className={cn("rounded-md bg-primary/10", className)} {...props} />
  );
};

export const TweetSkeleton = ({
  className,
  ...props
}: {
  className?: string;
  [key: string]: unknown;
}) => (
  <div
    className={cn(
      "flex size-full max-h-max min-w-72 flex-col gap-2 rounded-lg border p-4",
      className,
    )}
    {...props}
  >
    <div className="flex flex-row gap-2">
      <Skeleton className="size-10 shrink-0 rounded-full" />
      <Skeleton className="h-10 w-full" />
    </div>
    <Skeleton className="h-20 w-full" />
  </div>
);

export const TweetNotFound = ({
  className,
  ...props
}: {
  className?: string;
  [key: string]: unknown;
}) => (
  <div
    className={cn(
      "flex size-full flex-col items-center justify-center gap-2 rounded-lg border p-4",
      className,
    )}
    {...props}
  >
    <h3>Tweet not found</h3>
  </div>
);

export const TweetHeader = ({ tweet }: { tweet: EnrichedTweet }) => (
  <div className="flex flex-row justify-between tracking-tight">
    <div className="flex items-center space-x-2">
      <a href={tweet.user.url} target="_blank" rel="noreferrer">
        <img
          title={`Profile picture of ${tweet.user.name}`}
          alt={tweet.user.screen_name}
          height={48}
          width={48}
          src={tweet.user.profile_image_url_https}
          className="overflow-hidden rounded-full border border-transparent"
        />
      </a>
      <div>
        <a
          href={tweet.user.url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center whitespace-nowrap font-semibold"
        >
          {truncate(tweet.user.name, 20)}
          {tweet.user.verified ||
            (tweet.user.is_blue_verified && (
              <Verified className="ml-1 inline size-4 text-blue-500" />
            ))}
        </a>
        <div className="flex items-center space-x-1">
          <a
            href={tweet.user.url}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-gray-500 transition-all duration-75"
          >
            @{truncate(tweet.user.screen_name, 16)}
          </a>
        </div>
      </div>
    </div>
    <a href={tweet.url} target="_blank" rel="noreferrer">
      <span className="sr-only">Link to tweet</span>
      <Twitter className="size-5 items-start text-[#3BA9EE] transition-all ease-in-out hover:scale-105" />
    </a>
  </div>
);

export const TweetBody = ({ tweet }: { tweet: EnrichedTweet }) => (
  <div className="break-words leading-normal tracking-tighter">
    {tweet.entities.map((entity, idx) => {
      switch (entity.type) {
        case "url":
        case "symbol":
        case "hashtag":
        case "mention":
          return (
            <a
              key={idx}
              href={entity.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-normal text-gray-500"
            >
              <span>{entity.text}</span>
            </a>
          );
        case "text":
          return (
            <span
              key={idx}
              className="text-sm font-normal"
              dangerouslySetInnerHTML={{ __html: entity.text }}
            />
          );
      }
    })}
  </div>
);

export const TweetMedia = ({ tweet }: { tweet: EnrichedTweet }) => {
  // Cast to any to access non-standard properties
  const tweetAny = tweet as any;
  
  // Check if there's any media to display
  const hasPhotos = tweet.photos && tweet.photos.length > 0;
  const hasVideo = !!tweet.video;
  const hasCardMedia = tweetAny?.card?.binding_values?.thumbnail_image_large?.image_value?.url ||
                       tweetAny?.card?.binding_values?.player_image_large?.image_value?.url ||
                       tweetAny?.card?.binding_values?.player_stream_url?.string_value;
  
  if (!hasPhotos && !hasVideo && !hasCardMedia) {
    return null;
  }
  
  return (
    <div className="flex flex-1 items-center justify-center mt-3 w-full">
      {/* Video from tweet */}
      {hasVideo && (
        <video
          poster={tweet.video.poster}
          controls
          playsInline
          className="rounded-xl border shadow-sm w-full max-h-[450px] object-cover"
          style={{ maxWidth: '100%' }}
        >
          {tweet.video.variants.map((variant, index) => (
            <source key={index} src={variant.src} type={variant.type || "video/mp4"} />
          ))}
          Your browser does not support the video tag.
        </video>
      )}
      
      {/* Video from card (if no direct video) */}
      {!hasVideo && tweetAny?.card?.binding_values?.player_stream_url?.string_value && (
        <video
          poster={tweetAny?.card?.binding_values?.player_image_large?.image_value?.url || 
                 tweetAny?.card?.binding_values?.thumbnail_image_large?.image_value?.url}
          controls
          playsInline
          className="rounded-xl border shadow-sm w-full max-h-[450px] object-cover"
          style={{ maxWidth: '100%' }}
        >
          <source src={tweetAny.card.binding_values.player_stream_url.string_value} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      )}
      
      {/* Photos */}
      {hasPhotos && (
        <div className="relative flex w-full gap-1 overflow-hidden rounded-xl">
          {tweet.photos.length === 1 ? (
            <img
              src={tweet.photos[0].url}
              title={"Photo by " + tweet.user.name}
              alt={tweet.text}
              className="w-full h-auto max-h-[450px] rounded-xl border object-cover shadow-sm"
            />
          ) : (
            <div className="grid w-full gap-1 grid-cols-2">
              {tweet.photos.map((photo, i) => (
                <img
                  key={photo.url}
                  src={photo.url}
                  title={"Photo by " + tweet.user.name}
                  alt={`${tweet.text} - image ${i+1}`}
                  className="w-full h-auto rounded-xl border object-cover shadow-sm"
                  style={{ maxHeight: tweet.photos.length > 2 ? '220px' : '450px' }}
                />
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Thumbnail from card (if no videos or photos) */}
      {!hasVideo && !hasPhotos &&
        tweetAny?.card?.binding_values?.thumbnail_image_large?.image_value?.url && (
          <img
            src={tweetAny.card.binding_values.thumbnail_image_large.image_value.url}
            className="w-full h-auto max-h-[350px] rounded-xl border object-cover shadow-sm"
            alt={tweet.text}
          />
        )}
    </div>
  );
};

export const MagicTweet = ({
  tweet,
  components,
  className,
  summaryText,
  onSpeakSummary,
  playingTweetId,
  audioErrorTweetId,
  tweetId,
  ...props
}: {
  tweet: EnrichedTweet;
  components?: TwitterComponents;
  className?: string;
  summaryText?: string;
  onSpeakSummary?: (tweetId: string, summaryText: string) => void;
  playingTweetId?: string | null;
  audioErrorTweetId?: string | null;
  tweetId?: string;
  [key: string]: unknown;
}) => {
  return (
    <article
      className={cn(
        "flex size-full max-h-max min-w-72 flex-col gap-3",
        className,
      )}
      {...props}
    >
      <TweetHeader tweet={tweet} />
      <TweetBody tweet={tweet} />
      <TweetMedia tweet={tweet} />
    </article>
  );
};

export const ClientTweetCard = ({
  id,
  apiUrl,
  fallback = <TweetSkeleton />,
  components,
  fetchOptions,
  onError,
  className,
  onDelete,
  onSummarize,
  isSummarizing,
  summaryStatus,
  summaryText,
  onSpeakSummary,
  playingTweetId,
  audioErrorTweetId,
  ...props
}: TweetProps & {
  className?: string;
  onDelete?: () => void;
  onSummarize?: (id: string) => void;
  isSummarizing?: boolean;
  summaryStatus?: BookmarkItemType['status'];
  summaryText?: string;
  onSpeakSummary?: (tweetId: string, summaryText: string) => void;
  playingTweetId?: string | null;
  audioErrorTweetId?: string | null;
}) => {
  // Use correct parameter typing for useTweet
  const { data, error, isLoading } = useTweet(id);

  if (error) {
    if (onError) {
      onError(error);
    }
    console.error("Tweet loading error:", error);
    return <TweetNotFound className={className} {...props} />;
  }

  if (isLoading || !data) {
    return (
      <div className={cn("not-prose mb-2", className)} {...props}>
        {fallback}
      </div>
    );
  }

  const enrichedTweet = enrichTweet(data);

  return (
    <div
      className={cn(
        "not-prose rounded-lg border border-border bg-card text-card-foreground p-4 mb-2 max-w-full relative group",
        className
      )}
      {...props}
    >
      <MagicTweet
        tweet={enrichedTweet}
        components={components}
        summaryText={summaryText}
        onSpeakSummary={onSpeakSummary}
        playingTweetId={playingTweetId}
        audioErrorTweetId={audioErrorTweetId}
        tweetId={id}
      />
      
      {/* Controls */}
      {(onDelete || onSummarize) && (
        <div className="absolute bottom-2 right-2 z-10 flex space-x-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
          {onSummarize && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                if (id) {
                  onSummarize(id);
                }
              }}
              disabled={isSummarizing || summaryStatus === 'summarized'}
              title={summaryStatus === 'summarized' ? "Already Summarized" : summaryStatus === 'pending' ? "Pending" : "Summarize Content"}
              className="text-xs"
            >
              {isSummarizing ? (
                <><Zap className="w-4 h-4 mr-1 animate-pulse" /> Summarizing...</>
              ) : summaryStatus === 'summarized' ? (
                <><FileText className="w-4 h-4 mr-1" /> Summarized</>
              ) : summaryStatus === 'pending' ? (
                <><FileText className="w-4 h-4 mr-1" /> Pending</>
              ) : (
                <><FileText className="w-4 h-4 mr-1" /> Summarize</>
              )}
            </Button>
          )}
          {onDelete && (
            <Button
              variant="destructive"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              title="Delete Tweet Bookmark"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}; 