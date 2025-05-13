import React, { useEffect, useState } from 'react';
import { VideoItemType } from '../types/video';
import { getVideosService, updateVideoStatusService, deleteVideoService } from '../services/videoService';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ExternalLink, Info, Eye, PlayCircle, CheckCircle, HelpCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"


const VideosPage: React.FC = () => {
  const [videos, setVideos] = useState<VideoItemType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const data = await getVideosService();
      setVideos(data);
      setError(null);
    } catch (err) {
      setError('Failed to load videos. Please ensure the backend is running and refresh.');
      console.error('Error fetching videos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const handleStatusChange = async (videoId: string, newStatus: VideoItemType['watchedStatus']) => {
    try {
      const updatedVideo = await updateVideoStatusService(videoId, newStatus);
      setVideos(prevVideos => 
        prevVideos.map(v => v._id === videoId ? { ...v, watchedStatus: updatedVideo.watchedStatus, updatedAt: updatedVideo.updatedAt } : v)
      );
    } catch (err) {
      console.error('Error updating video status:', err);
      // Optionally show a toast notification for the error
      setError(`Failed to update status for video ${videoId}.`);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    // Optional: Add a confirmation dialog here
    // if (!window.confirm("Are you sure you want to delete this video?")) {
    //   return;
    // }
    try {
      await deleteVideoService(videoId);
      setVideos(videos.filter(video => video._id !== videoId));
      toast({
        title: "Success",
        description: "Video deleted successfully.",
      })
    } catch (err) {
      console.error(`Error deleting video ${videoId}:`, err);
      toast({
        title: "Error",
        description: "Failed to delete video.",
        variant: "destructive",
      })
    }
  };

  const groupedVideos = videos.reduce((acc, video) => {
    if (!acc[video.watchedStatus]) {
      acc[video.watchedStatus] = [];
    }
    acc[video.watchedStatus].push(video);
    return acc;
  }, {} as Record<VideoItemType['watchedStatus'], VideoItemType[]>);

  const sections: { title: string; status: VideoItemType['watchedStatus']; icon: React.ReactNode }[] = [
    { title: 'Watch Next', status: 'unwatched', icon: <PlayCircle className="mr-2 h-6 w-6 text-blue-500" /> },
    { title: 'Currently Watching', status: 'watching', icon: <Eye className="mr-2 h-6 w-6 text-yellow-500" /> },
    { title: 'Watched', status: 'watched', icon: <CheckCircle className="mr-2 h-6 w-6 text-green-500" /> },
  ];

  const statusOptions: { value: VideoItemType['watchedStatus']; label: string }[] = [
    { value: 'unwatched', label: 'Watch Next' },
    { value: 'watching', label: 'Watching' },
    { value: 'watched', label: 'Watched' },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-lg">Loading your video library...</p>
        {/* Consider adding a spinner component here */}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="max-w-2xl mx-auto mt-8">
        <Info className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl md:text-4xl font-bold mb-8 text-center">My Video Library</h1>
      
      {videos.length === 0 ? (
         <Alert className="max-w-lg mx-auto text-center">
            <HelpCircle className="h-5 w-5 mx-auto mb-2" />
            <AlertTitle className="font-semibold">No Videos Yet!</AlertTitle>
            <AlertDescription>
                Your video library is empty. Send YouTube links to your Synapse Telegram bot, 
                and they'll appear here, ready to be organized and watched.
            </AlertDescription>
        </Alert>
      ) : (
        sections.map(section => (
          <section key={section.status} className="mb-12">
            <div className="flex items-center mb-6">
              {section.icon}
              <h2 className="text-2xl font-semibold">{section.title} ({groupedVideos[section.status]?.length || 0})</h2>
            </div>
            {(groupedVideos[section.status]?.length || 0) === 0 ? (
              <p className="text-muted-foreground ml-10">No videos in this section.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {groupedVideos[section.status]
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) // Sort by newest first
                  .map(video => (
                  <Card key={video._id} className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
                    <a href={video.originalUrl} target="_blank" rel="noopener noreferrer" className="block">
                      {video.thumbnailUrl ? (
                        <img 
                            src={video.thumbnailUrl}
                            alt={`Thumbnail for ${video.title}`}
                            className="w-full h-48 object-cover cursor-pointer" 
                        />
                      ) : (
                        <div className="w-full h-48 bg-muted flex items-center justify-center text-muted-foreground">
                          No Thumbnail
                        </div>
                      )}
                    </a>
                    <CardHeader className="flex-grow p-4">
                      <CardTitle className="text-base font-semibold leading-tight mb-1 line-clamp-2" title={video.title}>
                        {video.title}
                      </CardTitle>
                      {video.channelTitle && (
                        <CardDescription className="text-xs text-muted-foreground line-clamp-1">
                          {video.channelTitle}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardFooter className="p-4 pt-2 border-t">
                        <Select 
                            value={video.watchedStatus}
                            onValueChange={(newStatus: VideoItemType['watchedStatus']) => handleStatusChange(video._id, newStatus)}
                        >
                            <SelectTrigger className="w-full text-xs h-9">
                                <SelectValue placeholder="Change status" />
                            </SelectTrigger>
                            <SelectContent>
                                {statusOptions.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button 
                          variant="destructive" 
                          size="icon" 
                          onClick={() => handleDeleteVideo(video._id)} 
                          className="mt-2 ml-2"
                          title="Delete Video"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </section>
        ))
      )}
    </div>
  );
};

export default VideosPage; 