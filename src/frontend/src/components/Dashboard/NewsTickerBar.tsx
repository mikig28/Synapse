import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Newspaper, TrendingUp, ExternalLink } from 'lucide-react';
import { newsHubService } from '@/services/newsHubService';
import { RealNewsArticle } from '@/types/newsHub';
import { useNavigate } from 'react-router-dom';

const NewsTickerBar: React.FC = () => {
  const [articles, setArticles] = useState<RealNewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const navigate = useNavigate();
  const tickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadLatestNews();
  }, []);

  const loadLatestNews = async () => {
    try {
      setIsLoading(true);
      const response = await newsHubService.getNewsFeed({
        page: 1,
        limit: 20,
        sortBy: 'date'
      });
      setArticles(response.data || []);
    } catch (error) {
      console.error('Failed to load news for ticker:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleArticleClick = (article: RealNewsArticle) => {
    // Mark as read and navigate to NewsHub
    newsHubService.markAsRead(article._id).catch(console.error);
    navigate('/news-hub');
  };

  const getCategoryColor = (category?: string): string => {
    const colors: Record<string, string> = {
      technology: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      business: 'bg-green-500/20 text-green-400 border-green-500/30',
      science: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      health: 'bg-red-500/20 text-red-400 border-red-500/30',
      sports: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      entertainment: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    };
    return colors[category?.toLowerCase() || ''] || 'bg-primary/20 text-primary border-primary/30';
  };

  if (isLoading) {
    return (
      <div className="w-full bg-gradient-to-r from-background via-muted/10 to-background border-b border-border/40 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 flex-shrink-0">
              <Newspaper className="w-4 h-4 text-primary animate-pulse" />
              <span className="text-xs font-semibold text-muted-foreground">LOADING NEWS...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (articles.length === 0) {
    return null;
  }

  // Double the articles array for seamless loop
  const doubledArticles = [...articles, ...articles];

  return (
    <div className="w-full bg-gradient-to-r from-background via-muted/10 to-background border-b border-border/40 backdrop-blur-sm shadow-sm">
      <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-3">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* News Icon & Label */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <div className="p-1 sm:p-1.5 bg-primary/10 rounded-full">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
            </div>
            <span className="text-[10px] sm:text-xs font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent hidden sm:inline">
              LATEST NEWS
            </span>
          </div>

          {/* Scrolling News Ticker */}
          <div
            className="flex-1 overflow-hidden relative"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <motion.div
              ref={tickerRef}
              className="flex gap-4 sm:gap-6"
              animate={{
                x: isPaused ? undefined : [0, -50 + '%'],
              }}
              transition={{
                x: {
                  repeat: Infinity,
                  repeatType: "loop",
                  duration: 60,
                  ease: "linear",
                },
              }}
            >
              {doubledArticles.map((article, index) => (
                <button
                  key={`${article._id}-${index}`}
                  onClick={() => handleArticleClick(article)}
                  className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 group cursor-pointer hover:opacity-80 transition-opacity"
                >
                  {article.category && (
                    <span className={`px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold uppercase tracking-wide border ${getCategoryColor(article.category)}`}>
                      {article.category.slice(0, 4)}
                    </span>
                  )}
                  <span className="text-[10px] sm:text-xs text-foreground font-medium group-hover:text-primary transition-colors whitespace-nowrap max-w-[150px] sm:max-w-[300px] truncate">
                    {article.title}
                  </span>
                  {!article.isRead && (
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                  )}
                  <ExternalLink className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </motion.div>

            {/* Gradient Fade on edges */}
            <div className="absolute left-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-r from-background to-transparent pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-l from-background to-transparent pointer-events-none" />
          </div>

          {/* View All Button */}
          <button
            onClick={() => navigate('/news-hub')}
            className="flex-shrink-0 text-[10px] sm:text-xs text-primary hover:text-primary/80 font-semibold transition-colors hidden md:block"
          >
            View All
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewsTickerBar;
