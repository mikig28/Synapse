import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { FeedbackModal } from './FeedbackModal';
import { 
  MessageCircle, 
  Bug, 
  Lightbulb, 
  Star,
  X,
  ChevronUp
} from 'lucide-react';

interface FeedbackWidgetProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  theme?: 'light' | 'dark' | 'auto';
  showQuickActions?: boolean;
  className?: string;
}

export const FeedbackWidget: React.FC<FeedbackWidgetProps> = ({
  position = 'bottom-right',
  theme = 'auto',
  showQuickActions = true,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [quickType, setQuickType] = useState<'bug' | 'feature' | 'rating' | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6'
  };

  const quickActions = [
    {
      type: 'bug' as const,
      icon: <Bug className="w-4 h-4" />,
      label: 'Report Bug',
      color: 'bg-red-500 hover:bg-red-600',
      description: 'Something is broken'
    },
    {
      type: 'feature' as const,
      icon: <Lightbulb className="w-4 h-4" />,
      label: 'Request Feature',
      color: 'bg-blue-500 hover:bg-blue-600',
      description: 'Suggest an improvement'
    },
    {
      type: 'rating' as const,
      icon: <Star className="w-4 h-4" />,
      label: 'Rate App',
      color: 'bg-yellow-500 hover:bg-yellow-600',
      description: 'Share your experience'
    }
  ];

  const handleQuickAction = (type: 'bug' | 'feature' | 'rating') => {
    setQuickType(type);
    setShowModal(true);
    setIsOpen(false);
  };

  const handleOpenGeneral = () => {
    setQuickType(null);
    setShowModal(true);
    setIsOpen(false);
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Widget */}
      <motion.div
        drag
        dragMomentum={false}
        style={{ touchAction: 'none' }}
        className={`fixed z-40 ${positionClasses[position]} ${className} relative`}
      >
        <button
          onClick={() => setIsVisible(false)}
          className="absolute -top-1 -right-1 bg-background dark:bg-foreground text-foreground dark:text-background hover:bg-background/80 dark:hover:bg-foreground/80 rounded-full p-1 shadow-md border border-border dark:border-background/20"
          aria-label="Dismiss feedback widget"
        >
          <X className="w-3 h-3" />
        </button>
        <AnimatePresence>
          {isOpen && showQuickActions && (
            <motion.div
              className="mb-4 space-y-2"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              {quickActions.map((action, index) => (
                <motion.div
                  key={action.type}
                  initial={{ opacity: 0, x: position.includes('right') ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Button
                    onClick={() => handleQuickAction(action.type)}
                    className={`
                      ${action.color} text-white 
                      min-w-[160px] justify-start gap-3 
                      shadow-lg hover:shadow-xl transition-all duration-200
                      backdrop-blur-sm border border-white/20
                    `}
                  >
                    {action.icon}
                    <div className="text-left">
                      <div className="font-medium text-sm">{action.label}</div>
                      <div className="text-xs opacity-90">{action.description}</div>
                    </div>
                  </Button>
                </motion.div>
              ))}
              
              {/* General Feedback Button */}
              <motion.div
                initial={{ opacity: 0, x: position.includes('right') ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: quickActions.length * 0.05 }}
              >
                <Button
                  onClick={handleOpenGeneral}
                  variant="outline"
                  className="
                    min-w-[160px] justify-start gap-3 
                    bg-background/80 backdrop-blur-sm 
                    border-border hover:bg-muted
                    shadow-lg hover:shadow-xl transition-all duration-200
                  "
                >
                  <MessageCircle className="w-4 h-4" />
                  <div className="text-left">
                    <div className="font-medium text-sm">General Feedback</div>
                    <div className="text-xs text-muted-foreground">Share your thoughts</div>
                  </div>
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Toggle Button */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            onClick={() => {
              if (showQuickActions) {
                setIsOpen(!isOpen);
              } else {
                setShowModal(true);
              }
            }}
            className={`
              relative w-14 h-14 rounded-full
              bg-primary hover:bg-primary/90 text-primary-foreground
              shadow-lg hover:shadow-xl transition-all duration-300
              ${isOpen ? 'rotate-45' : ''}
            `}
          >
            <AnimatePresence mode="wait">
              {isOpen ? (
                <motion.div
                  key="close"
                  initial={{ opacity: 0, rotate: -90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: 90 }}
                  transition={{ duration: 0.2 }}
                >
                  <X className="w-6 h-6" />
                </motion.div>
              ) : (
                <motion.div
                  key="feedback"
                  initial={{ opacity: 0, rotate: -90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: 90 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col items-center gap-1"
                >
                  <MessageCircle className="w-5 h-5" />
                  {showQuickActions && (
                    <ChevronUp className="w-3 h-3 opacity-60" />
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Pulse Animation */}
            <motion.div
              className="absolute inset-0 rounded-full bg-primary pointer-events-none"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.7, 0, 0.7]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </Button>
        </motion.div>

        {/* Tooltip */}
        {!isOpen && (
          <motion.div
            className={`
              absolute ${position.includes('right') ? 'right-16' : 'left-16'}
              ${position.includes('bottom') ? 'bottom-2' : 'top-2'}
              bg-card border border-border rounded-lg px-3 py-2
              shadow-lg backdrop-blur-sm
              pointer-events-none opacity-0 group-hover:opacity-100
              transition-opacity duration-200
            `}
            initial={{ opacity: 0, scale: 0.95 }}
            whileHover={{ opacity: 1, scale: 1 }}
          >
            <span className="text-sm font-medium text-foreground">
              Give Feedback
            </span>
          </motion.div>
        )}
      </motion.div>

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setQuickType(null);
        }}
        initialType={quickType}
      />
    </>
  );
};