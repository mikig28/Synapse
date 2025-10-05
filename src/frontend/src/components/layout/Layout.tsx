import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  // Sidebar should be CLOSED by default (collapsed to icons only)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  // <= 767px -> "mobile"
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" && window.innerWidth < 768
  );
  
  useEffect(() => {
    const onResize = () => {
      const newMobileState = window.innerWidth < 768;
      if (newMobileState !== isMobile) {
        setIsMobile(newMobileState);
        // Close sidebar when transitioning to mobile
        if (newMobileState) {
          setIsSidebarOpen(false);
        }
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [isMobile]);

  // Close sidebar on mobile when navigating
  useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

  const toggleSidebar = () => {
    console.log('[Layout] Toggling sidebar. Current:', isSidebarOpen, '-> New:', !isSidebarOpen);
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Page transition variants
  const pageVariants = {
    initial: { 
      opacity: 0, 
      y: 20,
      scale: 0.98
    },
    in: { 
      opacity: 1, 
      y: 0,
      scale: 1
    },
    out: { 
      opacity: 0, 
      y: -20,
      scale: 1.02
    }
  };

  const pageTransition = {
    type: 'tween',
    ease: 'anticipate',
    duration: 0.4
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-muted/10">
      {/* Subtle animated background pattern */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-0 left-0 w-full h-full opacity-5"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
          animate={{
            opacity: [0.02, 0.05, 0.02],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      <Header isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      
      <div className="flex flex-1 relative">
        {/* Enhanced scrim with blur effect */}
        <AnimatePresence>
          {isMobile && isSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden"
              onClick={toggleSidebar}
              aria-label="Close menu"
            />
          )}
        </AnimatePresence>

        <Sidebar isSidebarOpen={isSidebarOpen} />
        
        {/* Main content area with page transitions - adjusts width based on sidebar state */}
        <main 
          className="flex flex-col relative transition-all duration-300 ease-in-out"
          style={{
            width: isMobile ? '100%' : (isSidebarOpen ? 'calc(100% - 256px)' : 'calc(100% - 80px)'),
            flexGrow: 1,
            flexShrink: 1,
            minWidth: 0
          }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
              className="flex-1 overflow-y-auto w-full"
              style={{
                scrollbarWidth: 'thin',
              }}
            >
              <div className="relative z-10">
                {children}
              </div>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default Layout;
