import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import useAuthStore from '@/store/authStore';
import { GlassCard } from '@/components/ui/GlassCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { BACKEND_ROOT_URL } from '@/services/axiosConfig';
import { 
  Lightbulb, 
  Sparkles, 
  Calendar, 
  Tag,
  AlertCircle,
  Brain,
  Zap
} from 'lucide-react';

// Define an interface for the idea data
interface Idea {
  _id: string;
  content: string;
  source?: string;
  telegramMessageId?: string;
  createdAt: string;
  updatedAt: string;
}

const IdeasPage: React.FC = () => {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const token = useAuthStore((state) => state.token);

  const { ref: headerRef, isInView: headerVisible } = useScrollAnimation();
  const { ref: statsRef, isInView: statsVisible } = useScrollAnimation();

  useEffect(() => {
    const fetchIdeas = async () => {
      if (!token) {
        setError('Authentication token not found.');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch(`${BACKEND_ROOT_URL}/api/v1/ideas`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setIdeas(data);
        setError(null);
      } catch (err: any) {
        console.error("Failed to fetch ideas:", err);
        setError(err.message || 'Failed to fetch ideas.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchIdeas();
  }, [token]);

  const totalIdeas = ideas.length;
  const recentIdeas = ideas.filter(idea => {
    const createdDate = new Date(idea.createdAt);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return createdDate >= weekAgo;
  }).length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-900 via-orange-900 to-yellow-900 p-6">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {[...Array(2)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-900 via-orange-900 to-yellow-900 flex items-center justify-center p-6">
        <GlassCard className="p-8 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Error Loading Ideas</h2>
          <p className="text-red-300 mb-4">{error}</p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-900 via-orange-900 to-yellow-900 relative">
      {/* Animated Background Orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute w-96 h-96 bg-gradient-to-r from-yellow-400/20 to-amber-400/20 rounded-full blur-3xl"
          style={{ top: '10%', right: '10%' }}
          animate={{
            x: [0, -50, 0],
            y: [0, 40, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute w-80 h-80 bg-gradient-to-r from-orange-400/20 to-red-400/20 rounded-full blur-3xl"
          style={{ bottom: '20%', left: '10%' }}
          animate={{
            x: [0, 60, 0],
            y: [0, -30, 0],
            scale: [1, 0.9, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      <div className="relative z-10 container mx-auto p-6">
        {/* Header */}
        <motion.div
          ref={headerRef}
          className="text-center mb-12"
          initial={{ opacity: 0, y: 50 }}
          animate={headerVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          <div className="flex items-center justify-center mb-4">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <Lightbulb className="w-12 h-12 text-yellow-400" />
            </motion.div>
            <motion.div
              className="ml-2"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Sparkles className="w-6 h-6 text-amber-400" />
            </motion.div>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent mb-4">
            My Ideas
          </h1>
          <p className="text-yellow-100/80 text-lg max-w-2xl mx-auto">
            Capture and explore your creative thoughts and innovative concepts
          </p>
        </motion.div>

        {/* Statistics Cards */}
        <motion.div
          ref={statsRef}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          animate={statsVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <GlassCard className="p-6 text-center hover:scale-105 transition-transform duration-300">
            <Brain className="w-8 h-8 text-yellow-400 mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-white mb-1">{totalIdeas}</h3>
            <p className="text-yellow-100/70">Total Ideas</p>
          </GlassCard>
          <GlassCard className="p-6 text-center hover:scale-105 transition-transform duration-300">
            <Zap className="w-8 h-8 text-orange-400 mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-white mb-1">{recentIdeas}</h3>
            <p className="text-yellow-100/70">This Week</p>
          </GlassCard>
        </motion.div>

        {/* Ideas Grid */}
        {ideas.length === 0 ? (
          <motion.div
            className="text-center py-16"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
          >
            <GlassCard className="p-12 max-w-md mx-auto">
              <Lightbulb className="w-16 h-16 text-yellow-400/50 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No ideas yet</h3>
              <p className="text-yellow-100/70 mb-6">
                Your brilliant ideas will appear here as you capture them
              </p>
            </GlassCard>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ideas.map((idea, index) => (
              <motion.div
                key={idea._id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                whileHover={{ y: -5 }}
              >
                <GlassCard className="p-6 h-full flex flex-col hover:scale-105 transition-transform duration-300">
                  <div className="flex-1">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="p-2 bg-yellow-500/20 rounded-lg flex-shrink-0">
                        <Lightbulb className="w-5 h-5 text-yellow-400" />
                      </div>
                      <p className="text-yellow-100/90 leading-relaxed whitespace-pre-wrap">
                        {idea.content}
                      </p>
                    </div>
                  </div>
                  
                  <div className="border-t border-white/10 pt-4 mt-4">
                    <div className="flex items-center justify-between text-sm text-yellow-200/60 mb-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(idea.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    
                    {idea.source && (
                      <div className="flex items-center gap-1">
                        <Tag className="w-3 h-3 text-orange-400" />
                        <span className="px-2 py-1 bg-orange-500/20 rounded text-orange-300 text-xs">
                          {idea.source}
                        </span>
                      </div>
                    )}
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default IdeasPage; 