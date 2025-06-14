import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { GlassCard } from '@/components/ui/GlassCard';
import { cn } from '@/lib/utils';
import { Home, Inbox, Image, Bookmark, Video, CheckSquare, FileText, Lightbulb, Users, Calendar, Menu, X } from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: <Home size={20} /> },
  { href: '/inbox', label: 'Inbox', icon: <Inbox size={20} /> },
  { href: '/tasks', label: 'Tasks', icon: <CheckSquare size={20} /> },
  { href: '/notes', label: 'Notes', icon: <FileText size={20} /> },
  { href: '/ideas', label: 'Ideas', icon: <Lightbulb size={20} /> },
  { href: '/meetings', label: 'Meetings', icon: <Users size={20} /> },
  { href: '/calendar', label: 'Calendar', icon: <Calendar size={20} /> },
  { href: '/images', label: 'Images', icon: <Image size={20} /> },
  { href: '/bookmarks', label: 'Bookmarks', icon: <Bookmark size={20} /> },
  { href: '/videos', label: 'Videos', icon: <Video size={20} /> },
];

export const AnimatedNavigation: React.FC = () => {
  const location = useLocation();
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);

  return (
    <GlassCard className="glass-nav fixed top-4 left-1/2 transform -translate-x-1/2 z-50 hidden md:block">
      <nav className="flex space-x-2 p-2">
        {navItems.slice(0, 7).map((item, index) => {
          const isActive = location.pathname === item.href;
          const isHovered = hoveredPath === item.href;

          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link
                to={item.href}
                onMouseEnter={() => setHoveredPath(item.href)}
                onMouseLeave={() => setHoveredPath(null)}
                className={cn(
                  "relative px-4 py-2 rounded-lg transition-colors focus-ring",
                  "flex items-center space-x-2",
                  isActive ? "text-primary" : "text-foreground/70 hover:text-foreground"
                )}
              >
                {/* Background animation */}
                <AnimatePresence>
                  {(isActive || isHovered) && (
                    <motion.div
                      className={cn(
                        "absolute inset-0 rounded-lg",
                        isActive ? "bg-primary/10" : "bg-foreground/5"
                      )}
                      layoutId="nav-bg"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </AnimatePresence>

                {/* Icon and label */}
                <motion.span
                  className="relative z-10"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {item.icon}
                </motion.span>
                <motion.span 
                  className="relative z-10 hidden lg:block"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 + 0.1 }}
                >
                  {item.label}
                </motion.span>

                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full"
                    layoutId="active-indicator"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </Link>
            </motion.div>
          );
        })}
      </nav>
    </GlassCard>
  );
};

// Mobile Navigation Component
export const MobileNavigation: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  return (
    <>
      {/* Hamburger Button */}
      <motion.button
        className="fixed top-4 right-4 z-50 md:hidden p-2 rounded-lg glass"
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle menu"
      >
        <motion.div className="w-6 h-6 relative">
          <motion.span
            className="absolute w-6 h-0.5 bg-foreground"
            animate={isOpen ? { rotate: 45, y: 10 } : { rotate: 0, y: 0 }}
            style={{ top: '2px' }}
          />
          <motion.span
            className="absolute w-6 h-0.5 bg-foreground"
            animate={isOpen ? { opacity: 0 } : { opacity: 1 }}
            style={{ top: '10px' }}
          />
          <motion.span
            className="absolute w-6 h-0.5 bg-foreground"
            animate={isOpen ? { rotate: -45, y: -10 } : { rotate: 0, y: 0 }}
            style={{ top: '18px' }}
          />
        </motion.div>
      </motion.button>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setIsOpen(false)}
            />

            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, x: '100%' }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: '100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 40 }}
              className="fixed right-0 top-0 h-full w-80 max-w-full z-40 md:hidden"
            >
              <GlassCard className="h-full rounded-l-2xl p-8">
                <nav className="flex flex-col space-y-4 mt-16">
                  {navItems.map((item, index) => {
                    const isActive = location.pathname === item.href;

                    return (
                      <motion.div
                        key={item.href}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Link
                          to={item.href}
                          onClick={() => setIsOpen(false)}
                          className={cn(
                            "flex items-center space-x-3 px-4 py-3 rounded-lg transition-all",
                            "hover:bg-foreground/5 focus-ring",
                            isActive ? "bg-primary/10 text-primary" : "text-foreground/70"
                          )}
                        >
                          <motion.span
                            whileHover={{ scale: 1.1, rotate: 5 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            {item.icon}
                          </motion.span>
                          <span className="text-lg font-medium">{item.label}</span>
                          {isActive && (
                            <motion.div
                              className="ml-auto w-2 h-2 bg-primary rounded-full"
                              layoutId="mobile-active"
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            />
                          )}
                        </Link>
                      </motion.div>
                    );
                  })}
                </nav>
              </GlassCard>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}; 