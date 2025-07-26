import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapIcon, List, Filter, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onAddLocation?: () => void;
  filterCount?: number;
  className?: string;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onTabChange,
  onAddLocation,
  filterCount = 0,
  className
}) => {
  const tabs = [
    { id: 'map', label: 'Map', icon: MapIcon },
    { id: 'list', label: 'List', icon: List },
    { id: 'filter', label: 'Filter', icon: Filter, badge: filterCount }
  ];

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 md:hidden",
        "bg-background/80 backdrop-blur-xl border-t border-white/10",
        "safe-area-bottom",
        className
      )}
    >
      <div className="flex items-center justify-around py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.9 }}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "relative flex flex-col items-center justify-center",
                "w-full py-2 px-3 rounded-lg",
                "transition-colors duration-200",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div className="relative">
                <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
                {tab.badge && tab.badge > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-accent text-[10px] text-white flex items-center justify-center font-medium"
                  >
                    {tab.badge}
                  </motion.span>
                )}
              </div>
              <span className="text-xs mt-1">{tab.label}</span>
              
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 rounded-lg bg-primary/10"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
        
        {/* Floating Action Button */}
        {onAddLocation && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onAddLocation}
            className="absolute -top-6 right-4 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center"
          >
            <Plus className="h-6 w-6" />
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};