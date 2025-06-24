import React, { useEffect, useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { getVideosService } from '@/services/videoService';
import { VideoItemType } from '@/types/video';
import { Film } from 'lucide-react';

const RecentVideo: React.FC = () => {
  const [video, setVideo] = useState<VideoItemType | null>(null);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const list = await getVideosService();
        if (list.length > 0) {
          const sorted = [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setVideo(sorted[0]);
        }
      } catch (err) {
        console.error('Failed to load videos:', err);
      }
    };
    fetchVideos();
  }, []);

  if (!video) return null;

  return (
    <GlassCard className="mb-6">
      <div className="p-6">
        <div className="flex items-center mb-4">
          <Film className="w-5 h-5 text-primary mr-2" />
          <h3 className="text-lg font-semibold">Recent Video</h3>
        </div>
        <div className="flex items-center gap-4">
          {video.thumbnailUrl && (
            <img src={video.thumbnailUrl} alt={video.title} className="w-32 h-20 object-cover rounded" />
          )}
          <div className="flex-1">
            <p className="font-medium mb-2 line-clamp-2 text-sm">{video.title}</p>
            <AnimatedButton variant="secondary" size="sm" onClick={() => window.location.href = '/videos'}>
              Watch
            </AnimatedButton>
          </div>
        </div>
      </div>
    </GlassCard>
  );
};

export default RecentVideo;
