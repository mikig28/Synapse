import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTelegram } from '@/contexts/TelegramContext';
import { TelegramItemType } from '@/types/telegram';
import { GlassCard } from '@/components/ui/GlassCard';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { FloatingParticles } from '@/components/common/FloatingParticles';
import axiosInstance from '../services/axiosConfig';
import { 
  Image, 
  Sparkles, 
  Calendar, 
  User, 
  MessageCircle,
  ExternalLink,
  Trash2,
  Camera,
  Download,
  Loader2,
  Tag,
  Brain,
  Filter,
  Zap,
  TrendingUp,
  Smile,
  Meh,
  Frown
} from 'lucide-react';
import { SecureImage } from '@/components/common/SecureImage';

interface ImageStats {
  total: number;
  analyzed: number;
  pending: number;
  byCategory: Record<string, number>;
  bySource: {
    telegram: number;
    whatsapp: number;
  };
}

const ImagesPage: React.FC = () => {
  const { telegramItems, isConnected, deleteTelegramItem } = useTelegram();
  const { ref: headerRef, isInView: headerVisible } = useScrollAnimation();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [stats, setStats] = useState<ImageStats | null>(null);
  const [isBulkAnalyzing, setIsBulkAnalyzing] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  const imageItems = useMemo(() => {
    return telegramItems.filter(
      (item) => item.messageType === 'photo' && item.mediaGridFsId
    );
  }, [telegramItems]);

  // Filter images by category
  const filteredImages = useMemo(() => {
    if (selectedCategory === 'all') return imageItems;
    if (selectedCategory === 'unanalyzed') {
      return imageItems.filter(img => !img.aiAnalysis?.isAnalyzed);
    }
    return imageItems.filter(img => 
      img.aiAnalysis?.mainCategory === selectedCategory
    );
  }, [imageItems, selectedCategory]);

  // Fetch categories and stats on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoadingStats(true);
        const [categoriesRes, statsRes] = await Promise.all([
          axiosInstance.get('/image-analysis/categories'),
          axiosInstance.get('/image-analysis/stats')
        ]);
        
        if (categoriesRes.data.success) {
          setCategories(categoriesRes.data.data);
        }
        
        if (statsRes.data.success) {
          setStats(statsRes.data.data);
        }
      } catch (error) {
        console.error('Error fetching image data:', error);
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchData();
  }, []);

  // Refresh stats when images change
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axiosInstance.get('/image-analysis/stats');
        if (res.data.success) {
          setStats(res.data.data);
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    if (imageItems.length > 0) {
      fetchStats();
    }
  }, [imageItems.length]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring', stiffness: 100 }
    }
  };

  const handleDelete = async (itemId: string) => {
    if (window.confirm(`Are you sure you want to delete this image?`)) {
      try {
        await deleteTelegramItem(itemId);
      } catch (error) {
        console.error("Error deleting image:", error);
        alert(`Failed to delete image: ${(error as Error).message}`);
      }
    }
  };

  const downloadImage = async (gridFsId: string) => {
    try {
      setDownloadingId(gridFsId);
      
      const response = await axiosInstance.get(`/media/${gridFsId}`, {
        responseType: 'blob',
      });
      
      const blob = new Blob([response.data], { type: response.headers['content-type'] || 'image/jpeg' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `synapse_image_${gridFsId}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (error) {
      console.error('Error downloading image:', error);
      alert('Failed to download image. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  const openImageInNewTab = async (gridFsId: string) => {
    try {
      const response = await axiosInstance.get(`/media/${gridFsId}`, {
        responseType: 'blob',
      });
      
      const blob = new Blob([response.data], { type: response.headers['content-type'] || 'image/jpeg' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error('Error opening image:', error);
      alert('Failed to open image. Please try again.');
    }
  };

  const handleBulkAnalyze = async () => {
    if (!stats || stats.pending === 0) {
      alert('No images to analyze!');
      return;
    }

    if (!confirm(`Analyze ${stats.pending} images? This may take a few minutes.`)) {
      return;
    }

    try {
      setIsBulkAnalyzing(true);
      const response = await axiosInstance.post('/image-analysis/bulk-analyze?limit=20');

      if (response.data.success) {
        const { successful, failed, total } = response.data.data;
        alert(`Analysis complete!\n✅ Success: ${successful}\n❌ Failed: ${failed}\n📊 Total: ${total}`);
        // Refresh the page to show updated analysis
        window.location.reload();
      } else {
        alert('Analysis failed: ' + (response.data.error || 'Unknown error'));
      }
    } catch (error: any) {
      console.error('Error bulk analyzing:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
      alert(`Failed to analyze images: ${errorMsg}`);
    } finally {
      setIsBulkAnalyzing(false);
    }
  };

  const getSentimentIcon = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive': return <Smile className="w-4 h-4 text-green-400" />;
      case 'negative': return <Frown className="w-4 h-4 text-red-400" />;
      default: return <Meh className="w-4 h-4 text-gray-400" />;
    }
  };

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'negative': return 'bg-red-500/20 text-red-300 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-900 via-pink-900 to-purple-900 relative overflow-hidden">
      <FloatingParticles items={30} />
      
      {/* Animated Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-96 h-96 bg-gradient-to-r from-pink-400/20 to-rose-400/20 rounded-full blur-3xl"
          style={{ top: '10%', right: '10%' }}
          animate={{
            x: [0, -40, 0],
            y: [0, 30, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute w-80 h-80 bg-gradient-to-r from-purple-400/20 to-violet-400/20 rounded-full blur-3xl"
          style={{ bottom: '20%', left: '10%' }}
          animate={{
            x: [0, 50, 0],
            y: [0, -25, 0],
            scale: [1, 0.9, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      <motion.div 
        className="relative z-10 container mx-auto p-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div
          ref={headerRef}
          className="text-center mb-8"
          variants={itemVariants}
        >
          <div className="flex items-center justify-center mb-4">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <Image className="w-12 h-12 text-pink-400" />
            </motion.div>
            <motion.div
              className="ml-2"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Sparkles className="w-6 h-6 text-amber-400" />
            </motion.div>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent mb-4">
            Smart Image Gallery
          </h1>
          <p className="text-pink-100/80 text-lg max-w-2xl mx-auto">
            AI-powered image organization with automatic categorization and smart search
          </p>
        </motion.div>

        {/* Stats Bar */}
        <motion.div
          className="mb-6 grid grid-cols-2 md:grid-cols-5 gap-4"
          variants={itemVariants}
        >
          <GlassCard className="p-4 text-center">
            <div className="text-2xl font-bold text-white">{stats?.total || 0}</div>
            <div className="text-sm text-pink-100/70">Total Images</div>
          </GlassCard>
          
          <GlassCard className="p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <Brain className="w-5 h-5 text-purple-400" />
              <div className="text-2xl font-bold text-white">{stats?.analyzed || 0}</div>
            </div>
            <div className="text-sm text-pink-100/70">AI Analyzed</div>
          </GlassCard>
          
          <GlassCard className="p-4 text-center">
            <div className="text-2xl font-bold text-amber-400">{stats?.pending || 0}</div>
            <div className="text-sm text-pink-100/70">Pending</div>
          </GlassCard>
          
          <GlassCard className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">{stats?.bySource.telegram || 0}</div>
            <div className="text-sm text-pink-100/70">Telegram</div>
          </GlassCard>
          
          <GlassCard className="p-4 text-center">
            <div className="text-2xl font-bold text-green-400">{stats?.bySource.whatsapp || 0}</div>
            <div className="text-sm text-pink-100/70">WhatsApp</div>
          </GlassCard>
        </motion.div>

        {/* Filter Bar */}
        <motion.div
          className="mb-6 flex flex-wrap gap-4 items-center"
          variants={itemVariants}
        >
          <GlassCard className="flex items-center gap-2 px-4 py-2">
            <Filter className="w-4 h-4 text-pink-300" />
            <span className="text-sm text-white">Filter:</span>
          </GlassCard>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10 text-white text-sm focus:outline-none focus:border-pink-400/50"
          >
            <option value="all">All Categories ({imageItems.length})</option>
            <option value="unanalyzed">Unanalyzed ({stats?.pending || 0})</option>
            {Object.entries(stats?.byCategory || {}).map(([category, count]) => (
              <option key={category} value={category}>
                {category} ({count})
              </option>
            ))}
          </select>

          {stats && stats.pending > 0 && (
            <motion.button
              onClick={handleBulkAnalyze}
              disabled={isBulkAnalyzing}
              className="ml-auto px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-white font-medium flex items-center gap-2 hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isBulkAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Analyze {stats.pending} Images
                </>
              )}
            </motion.button>
          )}
        </motion.div>

        {/* Connection Status */}
        <motion.div
          className="mb-8 flex justify-center"
          variants={itemVariants}
        >
          <GlassCard className="px-6 py-3">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className="text-sm text-white">
                Socket Status: {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </GlassCard>
        </motion.div>

        {/* Images Grid */}
        {filteredImages.length === 0 ? (
          <motion.div
            className="text-center py-16"
            variants={itemVariants}
          >
            <GlassCard className="p-12 max-w-md mx-auto">
              <Camera className="w-16 h-16 text-pink-400/50 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                {selectedCategory === 'all' ? 'No images yet' : `No ${selectedCategory} images`}
              </h3>
              <p className="text-pink-100/70 mb-6">
                {selectedCategory === 'all' 
                  ? 'Send photos to your Telegram bot or WhatsApp to see them here'
                  : 'Try selecting a different category'
                }
              </p>
            </GlassCard>
          </motion.div>
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
            variants={containerVariants}
          >
            {filteredImages.map((item: TelegramItemType) => (
              <motion.div
                key={item._id}
                variants={itemVariants}
                whileHover={{ y: -5, scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
              >
                <GlassCard className="overflow-hidden group relative h-full flex flex-col">
                  {/* Delete Button */}
                  <motion.button
                    onClick={() => handleDelete(item._id)}
                    className="absolute top-2 right-2 z-10 p-2 bg-red-500/80 text-white rounded-full hover:bg-red-600/90 opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                    title="Delete image"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Trash2 size={16} />
                  </motion.button>

                  {/* Download Button */}
                  {item.mediaGridFsId && (
                    <motion.button
                      onClick={() => downloadImage(item.mediaGridFsId!)}
                      disabled={downloadingId === item.mediaGridFsId}
                      className="absolute bottom-2 right-2 z-10 p-2 bg-blue-500/80 text-white rounded-full hover:bg-blue-600/90 opacity-0 group-hover:opacity-100 transition-all focus:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Download image"
                      whileHover={{ scale: downloadingId === item.mediaGridFsId ? 1 : 1.1 }}
                      whileTap={{ scale: downloadingId === item.mediaGridFsId ? 1 : 0.9 }}
                    >
                      {downloadingId === item.mediaGridFsId ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Download size={16} />
                      )}
                    </motion.button>
                  )}

                  {/* AI Analysis Badge */}
                  {item.aiAnalysis?.isAnalyzed && (
                    <div className="absolute top-2 left-2 z-10 flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full bg-purple-500/80 text-white flex items-center gap-1`}>
                        <Brain className="w-3 h-3" />
                        AI
                      </span>
                    </div>
                  )}

                  {/* Source Badge */}
                  <div className="absolute top-12 left-2 z-10">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        item.source === 'whatsapp'
                          ? 'bg-green-500/80 text-white'
                          : 'bg-blue-500/80 text-white'
                      }`}
                      title={`Source: ${item.source === 'whatsapp' ? 'WhatsApp' : 'Telegram'}`}
                    >
                      {item.source === 'whatsapp' ? 'WA' : 'TG'}
                    </span>
                  </div>

                  {/* Image */}
                  <div className="relative overflow-hidden">
                    {item.mediaGridFsId && (
                      <button 
                        onClick={() => openImageInNewTab(item.mediaGridFsId!)}
                        className="block relative group w-full cursor-pointer"
                        type="button"
                      >
                        <SecureImage 
                          imageId={item.mediaGridFsId}
                          alt={item.aiAnalysis?.description || `Photo from ${item.fromUsername || 'Unknown'}`}
                          className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                          <ExternalLink className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </div>
                      </button>
                    )}
                  </div>

                  {/* Image Info */}
                  <div className="p-4 space-y-2 mt-auto flex-grow">
                    {/* AI Description */}
                    {item.aiAnalysis?.description && (
                      <p className="text-sm text-white/90 line-clamp-2 mb-2">
                        {item.aiAnalysis.description}
                      </p>
                    )}

                    {/* Category Badge */}
                    {item.aiAnalysis?.mainCategory && (
                      <div className="flex items-center gap-2 text-xs">
                        <Tag className="w-3 h-3 text-pink-300" />
                        <span className="px-2 py-1 bg-pink-500/20 text-pink-200 rounded-full border border-pink-500/30">
                          {item.aiAnalysis.mainCategory}
                        </span>
                      </div>
                    )}

                    {/* Tags */}
                    {item.aiAnalysis?.tags && item.aiAnalysis.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {item.aiAnalysis.tags.slice(0, 3).map((tag, index) => (
                          <span 
                            key={index}
                            className="px-2 py-0.5 text-xs bg-white/10 text-white/80 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                        {item.aiAnalysis.tags.length > 3 && (
                          <span className="px-2 py-0.5 text-xs bg-white/10 text-white/60 rounded">
                            +{item.aiAnalysis.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Sentiment & Confidence */}
                    {item.aiAnalysis?.isAnalyzed && (
                      <div className="flex items-center justify-between text-xs pt-2 border-t border-white/10">
                        <div className={`flex items-center gap-1 px-2 py-1 rounded border ${getSentimentColor(item.aiAnalysis.sentiment)}`}>
                          {getSentimentIcon(item.aiAnalysis.sentiment)}
                          <span className="capitalize">{item.aiAnalysis.sentiment}</span>
                        </div>
                        {item.aiAnalysis.confidence && (
                          <div className="flex items-center gap-1 text-white/60">
                            <TrendingUp className="w-3 h-3" />
                            {Math.round(item.aiAnalysis.confidence * 100)}%
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm text-pink-100/80">
                      <User className="w-3 h-3" />
                      <span>{item.fromUsername || 'Unknown User'}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-pink-100/80">
                      <MessageCircle className="w-3 h-3" />
                      <span>{item.chatTitle || 'DM'}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-pink-100/60">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(item.receivedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default ImagesPage;
