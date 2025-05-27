import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getCapturedTelegramItems } from '@/services/captureService';
import { GlassCard } from '@/components/ui/GlassCard';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { SkeletonCard, SkeletonList } from '@/components/ui/Skeleton';
import { useScrollAnimation, useRevealAnimation } from '@/hooks/useScrollAnimation';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Terminal, 
  Inbox, 
  Clock, 
  User, 
  MessageCircle, 
  ExternalLink, 
  RefreshCw,
  Filter,
  Search,
  TrendingUp
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import TelegramFeed from '@/components/Dashboard/TelegramFeed';
import useAuthStore from '@/store/authStore';

// Define the shape of a Telegram item for the frontend
interface TelegramItemFE {
  _id: string;
  telegramMessageId: number;
  chatId: number;
  chatTitle?: string;
  fromUsername?: string;
  text?: string;
  urls?: string[];
  messageType: string;
  mediaFileId?: string;
  receivedAt: string;
  createdAt: string;
  updatedAt: string;
}

const InboxPage: React.FC = () => {
  const [items, setItems] = useState<TelegramItemFE[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const storeToken = useAuthStore((state) => state.token);
  const storeIsAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const { ref: headerRef, isInView: headerInView } = useScrollAnimation();
  const { ref: feedRef, isInView: feedInView } = useScrollAnimation();
  const { ref: historyRef, isInView: historyInView } = useScrollAnimation();
  const revealAnimation = useRevealAnimation(0.1, 0.2);

  useEffect(() => {
    const fetchItems = async () => {
      console.log('[InboxPage] Attempting to fetch items. IsAuthenticated:', storeIsAuthenticated, 'Token Present:', !!storeToken);
      console.log('[InboxPage] Full authStore state before API call:', useAuthStore.getState());
      if (storeToken) {
        console.log('[InboxPage] Token value (first 20 chars):', storeToken.substring(0,20) + '...');
      }

      try {
        setLoading(true);
        const fetchedItems = await getCapturedTelegramItems();
        setItems(fetchedItems);
        setError(null);
      } catch (err: any) {
        console.error("Error fetching inbox items:", err);
        setError(err.message || "Failed to load inbox items.");
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, [storeToken, storeIsAuthenticated]);

  const handleRefresh = () => {
    setLoading(true);
    setError(null);
    // Re-trigger the effect by updating a dependency
    const fetchItems = async () => {
      try {
        const fetchedItems = await getCapturedTelegramItems();
        setItems(fetchedItems);
      } catch (err: any) {
        setError(err.message || "Failed to load inbox items.");
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  };

  const filteredItems = items.filter(item => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      item.text?.toLowerCase().includes(searchLower) ||
      item.fromUsername?.toLowerCase().includes(searchLower) ||
      item.chatTitle?.toLowerCase().includes(searchLower)
    );
  });

  const stats = {
    total: items.length,
    today: items.filter(item => {
      const today = new Date().toDateString();
      return new Date(item.receivedAt).toDateString() === today;
    }).length,
    withLinks: items.filter(item => item.urls && item.urls.length > 0).length,
    uniqueChats: new Set(items.map(item => item.chatId)).size
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-3 sm:p-4 md:p-8 space-y-6 sm:space-y-8">
        {/* Header Section */}
        <motion.div
          ref={headerRef}
          initial={{ opacity: 0, y: 30 }}
          animate={headerInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full mr-4">
              <Inbox className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold gradient-text">
                Inbox
              </h1>
              <p className="text-muted-foreground text-md sm:text-lg mt-1 sm:mt-2">
                Your captured content from all sources
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-6 sm:mt-8">
            {[
              { label: 'Total Items', value: stats.total, icon: MessageCircle },
              { label: 'Today', value: stats.today, icon: Clock },
              { label: 'With Links', value: stats.withLinks, icon: ExternalLink },
              { label: 'Chats', value: stats.uniqueChats, icon: User }
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 + 0.3 }}
              >
                <GlassCard className="text-center hover-lift">
                  <div className="p-4">
                    <stat.icon className="w-6 h-6 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Live Feed Section */}
        <motion.div
          ref={feedRef}
          initial={{ opacity: 0, y: 30 }}
          animate={feedInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <GlassCard>
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-gradient-to-br from-success/20 to-primary/20 rounded-full mr-3">
                  <TrendingUp className="w-5 h-5 text-success" />
                </div>
                <h2 className="text-2xl font-semibold gradient-text">Live Feed</h2>
                <div className="ml-auto flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                    <span className="text-xs text-muted-foreground">Live</span>
                  </div>
                </div>
              </div>
              <TelegramFeed />
            </div>
          </GlassCard>
        </motion.div>

        {/* History Section */}
        <motion.div
          ref={historyRef}
          initial={{ opacity: 0, y: 30 }}
          animate={historyInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <GlassCard>
            <div className="p-6">
              {/* Section Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                <h2 className="text-xl sm:text-2xl font-semibold gradient-text">
                  Captured Items History
                </h2>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
                  {/* Search */}
                  <div className="relative w-full sm:w-auto">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                    <Input
                      type="text"
                      placeholder="Search items..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 text-sm bg-background/50 hover:bg-background/70 focus:bg-background/70 border-border/50 focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <AnimatedButton
                    variant="ghost"
                    size="sm"
                    onClick={handleRefresh}
                    loading={loading}
                    className="hover-glow w-full sm:w-auto"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span className="sm:hidden ml-2">Refresh</span>
                  </AnimatedButton>
                </div>
              </div>

              {/* Content */}
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <SkeletonList items={6} />
                </motion.div>
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Alert variant="destructive" className="glass border-red-500/20">
                    <Terminal className="h-4 w-4" />
                    <AlertTitle>Error Loading History</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                </motion.div>
              )}

              {!loading && !error && filteredItems.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12"
                >
                  <div className="w-16 h-16 bg-muted/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <MessageCircle className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">
                    {searchTerm ? 'No items match your search.' : 'No historical items captured yet.'}
                  </p>
                </motion.div>
              )}

              {!loading && !error && filteredItems.length > 0 && (
                <motion.div
                  variants={revealAnimation.container}
                  initial="hidden"
                  animate="visible"
                  className="space-y-4"
                >
                  {filteredItems.map((item, index) => (
                    <motion.div
                      key={item._id}
                      variants={revealAnimation.item}
                      whileHover={{ scale: 1.01 }}
                      className="group"
                    >
                      <GlassCard className="hover-lift transition-all duration-200">
                        <div className="p-4">
                          {/* Header */}
                          <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center mb-3">
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                <User className="w-4 h-4 text-primary" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">
                                  {item.fromUsername || 'Unknown User'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {item.chatTitle || `Chat ${item.chatId}`}
                                </p>
                              </div>
                            </div>
                            <div className="text-left sm:text-right">
                              <p className="text-xs text-muted-foreground">
                                {new Date(item.receivedAt).toLocaleDateString()}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(item.receivedAt).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>

                          {/* Content */}
                          <p className="text-foreground/90 mb-3 leading-relaxed">
                            {item.text || '[No text content]'}
                          </p>

                          {/* Links */}
                          {item.urls && item.urls.length > 0 && (
                            <div className="mt-3 p-3 bg-muted/20 rounded-lg">
                              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center">
                                <ExternalLink className="w-3 h-3 mr-1" />
                                Links ({item.urls.length})
                              </p>
                              <div className="space-y-1">
                                {item.urls.map((url, urlIndex) => (
                                  <a
                                    key={urlIndex}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary hover:text-primary/80 transition-colors block truncate"
                                  >
                                    {url}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Footer */}
                          <div className="flex justify-between items-center mt-3 pt-3 border-t border-border/20">
                            <span className="text-xs text-muted-foreground px-2 py-1 bg-muted/20 rounded">
                              {item.messageType}
                            </span>
                            {item.mediaFileId && (
                              <span className="text-xs text-muted-foreground">
                                Media: {item.mediaFileId.substring(0,10)}...
                              </span>
                            )}
                          </div>
                        </div>
                      </GlassCard>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
};

export default InboxPage; 