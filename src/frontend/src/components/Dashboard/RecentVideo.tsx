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
      const res = await listRecommendations({
        status: 'approved',
        page: 1,
        pageSize: 1,
      });
      if (res.items.length > 0) {
        setRecommended(res.items[0]);
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
  const description = hasRecommendation ? 'Daily recommendation' : 'Most recently added';
  const timestamp = hasRecommendation
    ? recommended?.publishedAt ? new Date(recommended.publishedAt).toLocaleDateString() : undefined
    : fallbackVideo?.createdAt ? new Date(fallbackVideo.createdAt).toLocaleDateString() : undefined;

  return (
    <GlassCard className="mb-6">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Film className="w-5 h-5 text-primary mr-2" />
            <h3 className="text-lg font-semibold">{hasRecommendation ? 'Recommended For You' : 'Recent Video'}</h3>
          </div>
          <span className="text-xs text-muted-foreground">
            {hasRecommendation ? description : 'Latest capture'}
          </span>
        </div>
        <div className="flex items-center gap-4">
          {thumbnail && (
            <img src={thumbnail} alt={title} className="w-32 h-20 object-cover rounded" />
          )}
          <div className="flex-1">
            <p className="font-medium mb-1 line-clamp-2 text-sm">{title}</p>
            {channel && <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{channel}</p>}
            {timestamp && <p className="text-[11px] text-muted-foreground/80 mb-2">{timestamp}</p>}
            <AnimatedButton
              variant="secondary"
              size="sm"
              className="flex items-center gap-1"
              onClick={() => {
                if (hasRecommendation) {
                  window.open(link, '_blank', 'noopener');
                } else {
                  window.location.href = link;
                }
              }}
            >
              <Play className="w-3 h-3" />
              Watch
            </AnimatedButton>
          </div>
        </div>
      </div>
    </GlassCard>
  );
};

export default RecentVideo;
