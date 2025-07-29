/**
 * Mobile Navigation Component
 * Bottom tab bar with floating action button and contextual menus
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Bot, 
  BarChart3, 
  Settings, 
  Plus, 
  Home,
  Bookmark,
  Calendar,
  User
} from 'lucide-react';
import { useTouchGestures } from '@/hooks/useTouchGestures';

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  badge?: number;
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  color: string;
}

interface MobileNavigationProps {
  onCreateAgent?: () => void;
  onOpenQuickActions?: () => void;
}

const MobileNavigation: React.FC<MobileNavigationProps> = ({
  onCreateAgent,
  onOpenQuickActions,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showQuickActions, setShowQuickActions] = useState(false);

  // Navigation items
  const navigationItems: NavigationItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Home,
      path: '/',
    },
    {
      id: 'agents',
      label: 'Agents',
      icon: Bot,
      path: '/agents',
    },
    {
      id: 'bookmarks',
      label: 'Bookmarks',
      icon: Bookmark,
      path: '/bookmarks',
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      path: '/analytics',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      path: '/settings',
    },
  ];

  // Quick actions
  const quickActions: QuickAction[] = [
    {
      id: 'create-agent',
      label: 'Create Agent',
      icon: Bot,
      action: () => {
        onCreateAgent?.();
        setShowQuickActions(false);
      },
      color: 'bg-blue-500',
    },
    {
      id: 'schedule-task',
      label: 'Schedule Task',
      icon: Calendar,
      action: () => {
        navigate('/agents/scheduled');
        setShowQuickActions(false);
      },
      color: 'bg-green-500',
    },
    {
      id: 'view-profile',
      label: 'View Profile',
      icon: User,
      action: () => {
        navigate('/profile');
        setShowQuickActions(false);
      },
      color: 'bg-purple-500',
    },
  ];

  // Touch gesture support
  const { triggerHaptic } = useTouchGestures({
    onLongPress: () => {
      if (!showQuickActions) {
        triggerHaptic('medium');
        setShowQuickActions(true);
      }
    },
  });

  const handleTabPress = (item: NavigationItem) => {
    triggerHaptic('light');
    navigate(item.path);
  };

  const handleFabPress = () => {
    triggerHaptic('medium');
    if (onOpenQuickActions) {
      onOpenQuickActions();
    } else {
      setShowQuickActions(!showQuickActions);
    }
  };

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Quick Actions Overlay */}
      <AnimatePresence>
        {showQuickActions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowQuickActions(false)}
          >
            {/* Quick Actions Menu */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="absolute bottom-24 right-6 flex flex-col-reverse gap-3"
              onClick={(e) => e.stopPropagation()}
            >
              {quickActions.map((action, index) => (
                <motion.button
                  key={action.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ 
                    delay: index * 0.1,
                    type: 'spring',
                    damping: 20,
                    stiffness: 300,
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={action.action}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-full shadow-lg
                    ${action.color} text-white min-w-[140px]
                    active:shadow-sm transition-shadow
                  `}
                >
                  <action.icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{action.label}</span>
                </motion.button>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation Bar */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-lg border-t border-border/50"
      >
        <div className="flex items-center justify-around px-2 py-2 safe-area-bottom">
          {navigationItems.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;

            return (
              <motion.button
                key={item.id}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleTabPress(item)}
                className={`
                  flex flex-col items-center justify-center p-2 rounded-xl
                  min-w-[60px] min-h-[60px] relative
                  ${active 
                    ? 'text-primary bg-primary/10' 
                    : 'text-muted-foreground hover:text-foreground'
                  }
                  transition-colors duration-200
                `}
              >
                {/* Background highlight for active tab */}
                {active && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-primary/10 rounded-xl"
                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                  />
                )}

                {/* Icon */}
                <div className="relative z-10">
                  <Icon className={`w-6 h-6 ${active ? 'text-primary' : ''}`} />
                  
                  {/* Badge */}
                  {item.badge && item.badge > 0 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center"
                    >
                      {item.badge > 99 ? '99+' : item.badge}
                    </motion.div>
                  )}
                </div>

                {/* Label */}
                <span className={`
                  text-xs mt-1 relative z-10
                  ${active ? 'text-primary font-medium' : ''}
                `}>
                  {item.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Floating Action Button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ 
          delay: 0.3,
          type: 'spring', 
          damping: 15, 
          stiffness: 200 
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleFabPress}
        className="fixed bottom-20 right-6 z-40 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-xl flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))',
        }}
      >
        <motion.div
          animate={{ rotate: showQuickActions ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <Plus className="w-6 h-6" />
        </motion.div>
      </motion.button>

      {/* Safe area spacer for phones with home indicators */}
      <div className="h-safe-area-bottom" />
    </>
  );
};

export default MobileNavigation;