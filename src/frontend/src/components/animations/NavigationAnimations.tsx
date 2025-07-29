/**
 * Navigation Animation Components
 * Premium animated navigation, modals, and toast notifications
 * Includes mobile-optimized transitions and accessibility features
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useDragControls, PanInfo } from 'framer-motion';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { useAnimationContext, useHapticFeedback } from '@/contexts/AnimationContext';
import { 
  springPhysics,
  createTransition,
  overlayVariants,
  modalContentVariants,
  slideVariants,
  animationConfig
} from '@/utils/animations';
import { X, Check, AlertTriangle, Info, ChevronDown, Menu } from 'lucide-react';

// =============================================================================
// ANIMATED MODAL
// =============================================================================

interface AnimatedModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  animation?: 'scale' | 'slide' | 'fade';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  className?: string;
}

export const AnimatedModal: React.FC<AnimatedModalProps> = ({
  isOpen,
  onClose,
  children,
  title,
  size = 'md',
  animation = 'scale',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  className,
}) => {
  const { preferences } = useAnimationContext();
  const haptic = useHapticFeedback();
  const modalRef = useRef<HTMLDivElement>(null);

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4',
  };

  const animationVariants = {
    scale: modalContentVariants,
    slide: {
      hidden: { opacity: 0, y: 100 },
      visible: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: 100 },
    },
    fade: {
      hidden: { opacity: 0 },
      visible: { opacity: 1 },
      exit: { opacity: 0 },
    },
  };

  // Handle escape key
  useEffect(() => {
    if (!closeOnEscape || !isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  // Focus management
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      firstElement?.focus();
    }
  }, [isOpen]);

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      haptic('light');
      onClose();
    }
  }, [closeOnOverlayClick, onClose, haptic]);

  const handleClose = useCallback(() => {
    haptic('medium');
    onClose();
  }, [onClose, haptic]);

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={handleOverlayClick}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        
        {/* Modal Content */}
        <motion.div
          ref={modalRef}
          className={cn(
            "relative w-full bg-background border rounded-lg shadow-lg max-h-[90vh] overflow-hidden",
            sizeClasses[size],
            className
          )}
          variants={animationVariants[animation]}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between p-6 border-b">
              {title && (
                <h2 className="text-lg font-semibold">{title}</h2>
              )}
              {showCloseButton && (
                <motion.button
                  className="p-2 rounded-full hover:bg-muted transition-colors"
                  onClick={handleClose}
                  whileHover={preferences.enableAnimations ? { scale: 1.1 } : undefined}
                  whileTap={preferences.enableAnimations ? { scale: 0.9 } : undefined}
                  aria-label="Close modal"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              )}
            </div>
          )}
          
          {/* Body */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            {children}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

// =============================================================================
// BOTTOM SHEET (Mobile)
// =============================================================================

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  snapPoints?: number[];
  initialSnap?: number;
  className?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  children,
  title,
  snapPoints = [0.3, 0.6, 0.9],
  initialSnap = 1,
  className,
}) => {
  const { preferences } = useAnimationContext();
  const haptic = useHapticFeedback();
  const [currentSnap, setCurrentSnap] = useState(initialSnap);
  const dragControls = useDragControls();
  const sheetRef = useRef<HTMLDivElement>(null);

  const maxHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
  const currentHeight = snapPoints[currentSnap] * maxHeight;

  const handleDragEnd = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const { offset, velocity } = info;
    const threshold = 50;

    if (velocity.y > 500 || offset.y > threshold) {
      // Snap down or close
      if (currentSnap > 0) {
        setCurrentSnap(currentSnap - 1);
      } else {
        onClose();
      }
    } else if (velocity.y < -500 || offset.y < -threshold) {
      // Snap up
      if (currentSnap < snapPoints.length - 1) {
        setCurrentSnap(currentSnap + 1);
      }
    }

    haptic('light');
  }, [currentSnap, snapPoints.length, onClose, haptic]);

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50"
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
        
        {/* Sheet */}
        <motion.div
          ref={sheetRef}
          className={cn(
            "absolute bottom-0 left-0 right-0 bg-background rounded-t-xl shadow-lg overflow-hidden",
            className
          )}
          style={{ height: currentHeight }}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={springPhysics.gentle}
          drag="y"
          dragControls={dragControls}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.2 }}
          onDragEnd={handleDragEnd}
        >
          {/* Handle */}
          <div className="flex justify-center p-3 cursor-grab active:cursor-grabbing">
            <div className="w-12 h-1 bg-muted-foreground/30 rounded-full" />
          </div>
          
          {/* Header */}
          {title && (
            <div className="px-4 pb-2">
              <h2 className="text-lg font-semibold text-center">{title}</h2>
            </div>
          )}
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {children}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

// =============================================================================
// TOAST NOTIFICATIONS
// =============================================================================

interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
  duration?: number;
  onClose: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({
  id,
  type,
  title,
  description,
  duration = 5000,
  onClose,
}) => {
  const { preferences } = useAnimationContext();
  const haptic = useHapticFeedback();

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  const typeConfig = {
    success: {
      icon: Check,
      className: 'border-green-200 bg-green-50 text-green-800',
      iconClassName: 'text-green-500',
    },
    error: {
      icon: X,
      className: 'border-red-200 bg-red-50 text-red-800',
      iconClassName: 'text-red-500',
    },
    warning: {
      icon: AlertTriangle,
      className: 'border-yellow-200 bg-yellow-50 text-yellow-800',
      iconClassName: 'text-yellow-500',
    },
    info: {
      icon: Info,
      className: 'border-blue-200 bg-blue-50 text-blue-800',
      iconClassName: 'text-blue-500',
    },
  };

  const config = typeConfig[type];
  const Icon = config.icon;

  const handleClose = useCallback(() => {
    haptic('light');
    onClose(id);
  }, [id, onClose, haptic]);

  return (
    <motion.div
      className={cn(
        "relative flex items-start gap-3 p-4 rounded-lg border shadow-lg max-w-md",
        config.className
      )}
      initial={{ opacity: 0, x: 300, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 300, scale: 0.9 }}
      transition={springPhysics.bouncy}
      layout
    >
      <Icon className={cn("w-5 h-5 flex-shrink-0 mt-0.5", config.iconClassName)} />
      
      <div className="flex-1 min-w-0">
        <h4 className="font-medium">{title}</h4>
        {description && (
          <p className="text-sm opacity-90 mt-1">{description}</p>
        )}
      </div>
      
      <motion.button
        className="p-1 rounded-full hover:bg-black/10 transition-colors"
        onClick={handleClose}
        whileHover={preferences.enableAnimations ? { scale: 1.1 } : undefined}
        whileTap={preferences.enableAnimations ? { scale: 0.9 } : undefined}
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </motion.button>
      
      {/* Progress bar */}
      {duration > 0 && (
        <motion.div
          className="absolute bottom-0 left-0 h-1 bg-current opacity-30 rounded-bl-lg"
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: duration / 1000, ease: 'linear' }}
        />
      )}
    </motion.div>
  );
};

// =============================================================================
// TOAST CONTAINER
// =============================================================================

interface ToastContainerProps {
  toasts: ToastProps[];
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  position = 'top-right',
}) => {
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  return createPortal(
    <div className={cn("fixed z-50 flex flex-col gap-2", positionClasses[position])}>
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} />
        ))}
      </AnimatePresence>
    </div>,
    document.body
  );
};

// =============================================================================
// ANIMATED DROPDOWN
// =============================================================================

interface AnimatedDropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'bottom' | 'left' | 'right';
  offset?: number;
  className?: string;
}

export const AnimatedDropdown: React.FC<AnimatedDropdownProps> = ({
  trigger,
  children,
  align = 'start',
  side = 'bottom',
  offset = 8,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { preferences } = useAnimationContext();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const dropdownVariants = {
    hidden: {
      opacity: 0,
      scale: 0.95,
      y: side === 'bottom' ? -10 : side === 'top' ? 10 : 0,
      x: side === 'right' ? -10 : side === 'left' ? 10 : 0,
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      x: 0,
      transition: {
        ...springPhysics.gentle,
        staggerChildren: 0.05,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      transition: {
        duration: 0.15,
      },
    },
  };

  return (
    <div className="relative">
      {/* Trigger */}
      <div
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer"
      >
        {trigger}
      </div>
      
      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={dropdownRef}
            className={cn(
              "absolute z-50 bg-popover border rounded-md shadow-lg p-1 min-w-[200px]",
              {
                'top-full': side === 'bottom',
                'bottom-full': side === 'top',
                'left-full': side === 'right',
                'right-full': side === 'left',
                'left-0': align === 'start' && (side === 'top' || side === 'bottom'),
                'right-0': align === 'end' && (side === 'top' || side === 'bottom'),
                'left-1/2 -translate-x-1/2': align === 'center' && (side === 'top' || side === 'bottom'),
                'top-0': align === 'start' && (side === 'left' || side === 'right'),
                'bottom-0': align === 'end' && (side === 'left' || side === 'right'),
                'top-1/2 -translate-y-1/2': align === 'center' && (side === 'left' || side === 'right'),
              },
              className
            )}
            style={{
              marginTop: side === 'bottom' ? offset : side === 'top' ? -offset : 0,
              marginLeft: side === 'right' ? offset : side === 'left' ? -offset : 0,
            }}
            variants={dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// =============================================================================
// MOBILE NAVIGATION DRAWER
// =============================================================================

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  side?: 'left' | 'right';
  width?: string;
}

export const MobileNavDrawer: React.FC<MobileNavDrawerProps> = ({
  isOpen,
  onClose,
  children,
  side = 'left',
  width = '280px',
}) => {
  const { preferences } = useAnimationContext();
  const haptic = useHapticFeedback();
  const dragControls = useDragControls();

  const drawerVariants = {
    hidden: {
      x: side === 'left' ? '-100%' : '100%',
    },
    visible: {
      x: 0,
      transition: springPhysics.gentle,
    },
    exit: {
      x: side === 'left' ? '-100%' : '100%',
      transition: springPhysics.snappy,
    },
  };

  const handleDragEnd = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const { offset, velocity } = info;
    const threshold = 100;
    
    const shouldClose = side === 'left' 
      ? offset.x < -threshold || velocity.x < -500
      : offset.x > threshold || velocity.x > 500;

    if (shouldClose) {
      haptic('medium');
      onClose();
    }
  }, [side, onClose, haptic]);

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-40"
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
        
        {/* Drawer */}
        <motion.div
          className={cn(
            "absolute top-0 bottom-0 bg-background shadow-xl",
            side === 'left' ? 'left-0' : 'right-0'
          )}
          style={{ width }}
          variants={drawerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          drag="x"
          dragControls={dragControls}
          dragConstraints={side === 'left' ? { left: -200, right: 0 } : { left: 0, right: 200 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
        >
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};