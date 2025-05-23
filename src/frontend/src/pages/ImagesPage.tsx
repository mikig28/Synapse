import React from 'react';
import { motion } from 'framer-motion';
import { useTelegram } from '@/contexts/TelegramContext';
import { TelegramItemType } from '@/types/telegram';
import { GlassCard } from '@/components/ui/GlassCard';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { STATIC_ASSETS_BASE_URL } from '../services/axiosConfig';
import { 
  Image, 
  Sparkles, 
  Calendar, 
  User, 
  MessageCircle,
  ExternalLink,
  Trash2,
  Camera
} from 'lucide-react';

const ImagesPage: React.FC = () => {
  const { telegramItems, isConnected, deleteTelegramItem } = useTelegram();
  const { ref: headerRef, isInView: headerVisible } = useScrollAnimation();

  const imageItems = telegramItems.filter(
    (item) => item.messageType === 'photo' && item.mediaLocalUrl
  );

  const handleDelete = async (itemId: string, itemInfo: string) => {
    if (window.confirm(`Are you sure you want to delete this image (${itemInfo})?`)) {
      try {
        await deleteTelegramItem(itemId);
      } catch (error) {
        console.error("Error deleting image:", error);
        alert(`Failed to delete image: ${(error as Error).message}`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-900 via-pink-900 to-purple-900 relative">
      {/* Animated Background Orbs */}
      <div className="absolute inset-0 overflow-hidden">
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
            Captured Images
          </h1>
          <p className="text-pink-100/80 text-lg max-w-2xl mx-auto">
            Your visual memories and moments captured through Telegram
          </p>
        </motion.div>

        {/* Connection Status */}
        <motion.div
          className="mb-8 flex justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
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
        {imageItems.length === 0 ? (
          <motion.div
            className="text-center py-16"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
          >
            <GlassCard className="p-12 max-w-md mx-auto">
              <Camera className="w-16 h-16 text-pink-400/50 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No images yet</h3>
              <p className="text-pink-100/70 mb-6">
                Send photos to your Telegram bot to see them here
              </p>
            </GlassCard>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {imageItems.map((item: TelegramItemType, index) => (
              <motion.div
                key={item._id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                whileHover={{ y: -5 }}
              >
                <GlassCard className="overflow-hidden group relative hover:scale-105 transition-transform duration-300">
                  {/* Delete Button */}
                  <motion.button
                    onClick={() => handleDelete(item._id, item.mediaLocalUrl || item._id)}
                    className="absolute top-2 right-2 z-10 p-2 bg-red-500/80 text-white rounded-full hover:bg-red-600/90 opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                    title="Delete image"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Trash2 size={16} />
                  </motion.button>

                  {/* Image */}
                  <div className="relative overflow-hidden">
                    <a 
                      href={`${STATIC_ASSETS_BASE_URL}${item.mediaLocalUrl}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block relative group"
                    >
                      <img 
                        src={`${STATIC_ASSETS_BASE_URL}${item.mediaLocalUrl}`}
                        alt={`Telegram Photo from ${item.fromUsername || 'Unknown'} in ${item.chatTitle || 'DM'}`}
                        className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                        <ExternalLink className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                    </a>
                  </div>

                  {/* Image Info */}
                  <div className="p-4 space-y-2">
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
          </div>
        )}
      </div>
    </div>
  );
};

export default ImagesPage; 