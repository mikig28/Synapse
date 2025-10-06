import React, { useEffect, useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { getVideosService } from '@/services/videoService';
import { VideoItemType } from '@/types/video';
import { Film, Play } from 'lucide-react';
import { listRecommendations } from '@/services/videoRecommendationsService';
import { RecommendationVideo } from '@/types/youtube';

const RecentVideo: React.FC = () => {
  const [recommended, setRecommended] = useState<RecommendationVideo | null>(null);
  const [fallbackVideo, setFallbackVideo] = useState<VideoItemType | null>(null);

  const loadRecommended = async () => {
    try {
      // Fetch multiple recommendations (pending or approved) to pick randomly from
      const res = await listRecommendations({
        status: undefined, // Get all statuses (pending, approved, etc.)
        page: 1,
        pageSize: 20, // Get more to have variety
      });
      if (res.items.length > 0) {
        // Pick a random video from the list
        const randomIndex = Math.floor(Math.random() * res.items.length);
        setRecommended(res.items[randomIndex]);
        return;
      }
    } catch (error) {
      console.warn('Failed to load recommended video', error);
    }
    await loadFallbackVideo();
  };

  const loadFallbackVideo = async () => {
    try {
      const list = await getVideosService();
      if (list.length > 0) {
        const sorted = [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setFallbackVideo(sorted[0]);
      }
    } catch (err) {
      console.error('Failed to load videos:', err);
    }
  };

  useEffect(() => {
    loadRecommended();
  }, []);

  const hasRecommendation = !!recommended;
  const display = hasRecommendation ? recommended : fallbackVideo;

  if (!display) return null;

  const thumbnail = hasRecommendation
    ? recommended?.thumbnails?.high?.url || recommended?.thumbnails?.default?.url
    : fallbackVideo?.thumbnailUrl;

  const title = display.title;
  const channel = hasRecommendation ? recommended?.channelTitle : fallbackVideo?.channelTitle;
  const link = hasRecommendation
    ? `https://www.youtube.com/watch?v=${recommended?.videoId}`
    : '/videos';
  const description = hasRecommendation ? 'Fresh pick' : 'Most recently added';
  const timestamp = hasRecommendation
    ? recommended?.publishedAt ? new Date(recommended.publishedAt).toLocaleDateString() : undefined
    : fallbackVideo?.createdAt ? new Date(fallbackVideo.createdAt).toLocaleDateString() : undefined;

  return (
    <div className="w-full max-w-full min-w-0 overflow-hidden">
      <div className="flex items-center justify-between mb-2 overflow-hidden max-w-full">
        <div className="flex items-center min-w-0 flex-1 overflow-hidden">
          <Film className="w-4 h-4 sm:w-5 sm:h-5 text-primary mr-2 flex-shrink-0" />
          <h3 className="text-sm sm:text-base font-semibold truncate min-w-0">{hasRecommendation ? 'Recommended For You' : 'Recent Video'}</h3>
        </div>
        <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap flex-shrink-0 ml-2">
          {hasRecommendation ? description : 'Latest capture'}
        </span>
      </div>
      <div className="flex items-start gap-2 sm:gap-3 overflow-hidden max-w-full">
        {thumbnail && (
          <div className="flex-shrink-0 w-20 sm:w-24 overflow-hidden rounded">
            <img src={thumbnail} alt={title} className="w-full h-auto object-cover rounded" style={{ maxHeight: '60px' }} />
          </div>
        )}
        <div className="flex-1 min-w-0 overflow-hidden">
          <p className="font-medium mb-1 line-clamp-2 text-xs sm:text-sm overflow-hidden" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{title}</p>
          {channel && <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 line-clamp-1 truncate">{channel}</p>}
          {timestamp && <p className="text-[10px] text-muted-foreground/80 mb-2 truncate">{timestamp}</p>}
          <AnimatedButton
            variant="secondary"
            size="sm"
            className="flex items-center gap-1 text-xs"
            onClick={() => {
              if (hasRecommendation) {
                window.open(link, '_blank', 'noopener');
              } else {
                window.location.href = link;
              }
            }}
          >
            <Play className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">Watch</span>
          </AnimatedButton>
        </div>
      </div>
    </div>
  );
};

export default RecentVideo;
