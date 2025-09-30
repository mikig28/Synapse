import React from 'react';
import { motion } from 'framer-motion';
import { useTelegram } from '@/contexts/TelegramContext';
import { TelegramItemType } from '@/types/telegram';
import { GlassCard } from '@/components/ui/GlassCard';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { STATIC_ASSETS_BASE_URL } from '../services/axiosConfig';
import { FloatingParticles } from '@/components/common/FloatingParticles';
import { 
  Image, 
  Sparkles, 
  Calendar, 
  User, 
  MessageCircle,
  ExternalLink,
  Trash2,
  Camera,
  Download
} from 'lucide-react';
import { SecureImage } from '@/components/common/SecureImage';

const ImagesPage: React.FC = () => {
  const { telegramItems, isConnected, deleteTelegramItem } = useTelegram();
  const { ref: headerRef, isInView: headerVisible } = useScrollAnimation();

  const imageItems = telegramItems.filter(
    (item) => item.messageType === 'photo' && item.mediaGridFsId
  );

  // Standard container and item variants for consistent page animations
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

  const downloadImage = (gridFsId: string) => {
    const link = document.createElement('a');
    link.href = `/media/${gridFsId}`;
    link.download = `synapse_image_${gridFsId}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
          className="text-center mb-12"
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
            Captured Images
          </h1>
          <p className="text-pink-100/80 text-lg max-w-2xl mx-auto">
            Your visual memories and moments captured through Telegram and WhatsApp
          </p>
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
        {imageItems.length === 0 ? (
          <motion.div
            className="text-center py-16"
            variants={itemVariants}
          >
            <GlassCard className="p-12 max-w-md mx-auto">
              <Camera className="w-16 h-16 text-pink-400/50 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No images yet</h3>
              <p className="text-pink-100/70 mb-6">
                Send photos to your Telegram bot or move WhatsApp images to see them here
              </p>
            </GlassCard>
          </motion.div>
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
            variants={containerVariants}
          >
            {imageItems.map((item: TelegramItemType, index) => (
              <motion.div
                key={item._id}
                variants={itemVariants}
                whileHover={{ y: -5, scale: 1.03 }}
                transition={{type: "spring", stiffness: 300, damping: 15}}
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
                  <motion.button
                    onClick={() => downloadImage(item.mediaGridFsId)}
                    className="absolute bottom-2 right-2 z-10 p-2 bg-blue-500/80 text-white rounded-full hover:bg-blue-600/90 opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                    title="Download image"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Download size={16} />
                  </motion.button>

                  {/* Source Badge */}
                  <div className="absolute top-2 left-2 z-10">
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
                    <a 
                      href={item.mediaGridFsId ? `/media/${item.mediaGridFsId}` : '#'}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block relative group"
                    >
                      <SecureImage 
                        imageId={item.mediaGridFsId}
                        alt={`Telegram Photo from ${item.fromUsername || 'Unknown'} in ${item.chatTitle || 'DM'}`}
                        className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                        <ExternalLink className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                    </a>
                  </div>

                  {/* Image Info */}
                  <div className="p-4 space-y-2 mt-auto">
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