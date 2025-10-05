import React from 'react';
import {
  LayoutDashboard,
  Inbox,
  Search,
  Aperture,
  Briefcase,
  ListChecks,
  CalendarDays,
  MessageSquare,
  Youtube,
  Newspaper,
  Bookmark,
  Repeat,
  Target,
  Bot,
  Plane,
  Settings as SettingsIcon,
  Image as ImageIcon,
  FileText,
  Lightbulb,
  Mic,
  Clock,
  ChevronUp,
  ChevronDown,
  MapPin,
  Map as MapIcon,
  BookOpen,
  Camera,
  Send,
  UtensilsCrossed,
  Video,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { VideoLogo } from '@/components/ui/VideoLogo';

// Define props for Sidebar
interface SidebarProps {
  isSidebarOpen: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isSidebarOpen }) => {
  const [showScrollTop, setShowScrollTop] = React.useState(false);
  const [showScrollBottom, setShowScrollBottom] = React.useState(false);
  const navRef = React.useRef<HTMLElement>(null);

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/search", label: "Search", icon: Search },
    { href: "/inbox", label: "Inbox", icon: Inbox },
    { href: "/settings", label: "Settings", icon: SettingsIcon },
    { href: "/images", label: "Images", icon: ImageIcon },
    { href: "/capture", label: "Capture", icon: Aperture }, 
    { href: "/projects", label: "Projects", icon: Briefcase }, 
    { href: "/tasks", label: "Tasks", icon: ListChecks },
    { href: "/notes", label: "Notes", icon: FileText },
    { href: "/ideas", label: "Ideas", icon: Lightbulb },
    { href: "/docs", label: "Docs", icon: BookOpen },
    { href: "/meetings", label: "Meetings", icon: Mic },
    { href: "/agents", label: "AI Agents", icon: Bot },
    { href: "/scheduled-agents", label: "Scheduled Agents", icon: Clock },
    { href: "/calendar", label: "Calendar", icon: CalendarDays }, 
    { href: "/places", label: "Places", icon: MapIcon },
    { href: "/planning", label: "Planning", icon: Plane }, 
    { href: "/goals", label: "Goals", icon: Target }, 
    { href: "/habits", label: "Habits", icon: Repeat }, 
    { href: "/automations", label: "Automations", icon: Repeat }, 
    { href: "/whatsapp", label: "WhatsApp", icon: MessageSquare }, 
    { href: "/whatsapp-monitor", label: "WhatsApp Monitor", icon: Camera }, 
    { href: "/telegram-channels", label: "Telegram Channels", icon: Send },
    { href: "/bookmarks", label: "Bookmarks", icon: Bookmark },
    { href: "/videos", label: "Videos", icon: Youtube },
    { href: "/recipes", label: "Recipes", icon: UtensilsCrossed },
    { href: "/reels-stories", label: "Reels & Stories", icon: Video },
    { href: "/news", label: "Agents Reports", icon: Newspaper },
    { href: "/news-hub", label: "News Hub", icon: Newspaper },
  ];

  const location = useLocation();

  // Check scroll position to show/hide indicators
  const checkScroll = React.useCallback(() => {
    if (navRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = navRef.current;
      setShowScrollTop(scrollTop > 10);
      setShowScrollBottom(scrollTop < scrollHeight - clientHeight - 10);
    }
  }, []);

  React.useEffect(() => {
    const nav = navRef.current;
    if (nav) {
      checkScroll();
      nav.addEventListener('scroll', checkScroll);
      // Also check on resize
      window.addEventListener('resize', checkScroll);
      return () => {
        nav.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [checkScroll]);

  // Scroll functions
  const scrollToTop = () => {
    navRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToBottom = () => {
    if (navRef.current) {
      navRef.current.scrollTo({ top: navRef.current.scrollHeight, behavior: 'smooth' });
    }
  };

  const linkVariants = {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    hover: { scale: 1.05, backgroundColor: "rgba(255, 255, 255, 0.1)" },
    tap: { scale: 0.98 }
  };

  return (
    <aside
      className={`
        flex flex-col z-40
        bg-gray-900 backdrop-blur-sm border-r border-white/10
        transition-all duration-300 ease-in-out
        
        /* DESKTOP (≥ md) ----------------------------------- */
        hidden md:flex md:sticky md:top-0 
        md:h-screen md:max-h-screen md:overflow-hidden
        ${isSidebarOpen ? "md:w-64" : "md:w-20"}

        /* MOBILE (< md) ------------------------------------ */
        ${isSidebarOpen ? "flex" : "hidden"}
        fixed top-0 left-0 md:relative h-dvh 
        ${isSidebarOpen ? "w-64 translate-x-0 shadow-2xl" : "w-20 -translate-x-full"}
        
        /* Mobile optimizations for better clarity */
        md:bg-gray-900/95 md:backdrop-blur-md
        supports-[backdrop-filter]:md:bg-gray-900/90
        supports-[backdrop-filter]:md:backdrop-blur-lg
      `}
      aria-label="Primary"
    >
      {/* Header section - fixed height */}
      <div className={`px-4 pt-4 pb-2 flex items-center flex-shrink-0 ${isSidebarOpen ? 'justify-start' : 'justify-center'}`}>
        {/* Synapse Logo/Icon - visible when open, tiny icon when closed */}
        <Link to="/dashboard" className="flex items-center gap-2">
          <VideoLogo 
            size={isSidebarOpen ? "lg" : "sm"} 
            playOnHover={true}
            className="transition-all duration-300 glow-effect-purple-sm"
            fallbackIcon={
              <motion.svg 
                width={isSidebarOpen ? "48" : "24"} 
                height={isSidebarOpen ? "48" : "24"} 
                viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
                className="text-purple-400 transition-all duration-300"
                animate={{ rotate: isSidebarOpen ? 0 : 360 }}
                transition={{ duration: 0.5 }}
              >
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </motion.svg>
            }
          />
          <h2 className={`text-xl md:text-2xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent whitespace-nowrap transition-all duration-300 ${isSidebarOpen ? 'opacity-100 w-auto ml-2 visible' : 'opacity-0 w-0 ml-0 invisible overflow-hidden'}`}>
            Synapse
          </h2>
        </Link>
      </div>
      
      {/* Scroll top indicator */}
      {showScrollTop && (
        <div className="px-4 py-1 flex justify-center">
          <button 
            onClick={scrollToTop}
            className="p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Scroll to top"
          >
            <ChevronUp className="h-4 w-4 text-white/60" />
          </button>
        </div>
      )}
      
      {/* Navigation section - flexible and scrollable */}
      <nav 
        ref={navRef}
        className="flex-1 min-h-0 px-4 overflow-y-scroll overflow-x-hidden relative
          scrollbar scrollbar-w-2 scrollbar-thumb-purple-500/50 scrollbar-track-white/10 
          hover:scrollbar-thumb-purple-500/70"
        style={{
          scrollbarWidth: 'auto',
          scrollbarColor: 'rgba(168, 85, 247, 0.6) rgba(255, 255, 255, 0.2)',
          maxHeight: 'calc(100vh - 240px)',
          overflowY: 'scroll'
        }}
      >
        <ul className="flex flex-col gap-1 md:gap-2 py-2">
          {navItems.map((item, index) => {
            const IconComponent = item.icon;
            const isActive = location.pathname.startsWith(item.href);
            return (
              <motion.li 
                key={item.label}
                variants={linkVariants}
                initial="initial"
                animate="animate"
                whileHover="hover"
                whileTap="tap"
                transition={{ delay: index * 0.05, type: "spring", stiffness: 300, damping: 20 }}
              >
                <Link 
                  to={item.href} 
                  className={`
                    flex items-center p-2 md:p-3 rounded-lg group transition-all duration-200 ease-in-out
                    ${isSidebarOpen ? 'justify-start' : 'justify-center'}
                    ${isActive 
                      ? 'bg-gradient-to-r from-pink-500/30 to-purple-500/30 text-white shadow-md border border-white/20' 
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }
                  `}
                >
                  <IconComponent className={`
                    h-5 w-5 md:h-5 md:w-5 transition-colors duration-200 flex-shrink-0
                    ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-purple-300'}
                    ${isSidebarOpen ? 'mr-3' : 'mx-auto'}
                  `} />
                  <span className={`text-sm font-medium whitespace-nowrap transition-all duration-300 ${isSidebarOpen ? 'opacity-100 visible ml-0' : 'opacity-0 invisible overflow-hidden w-0 max-w-0'}`}>
                    {item.label}
                  </span>
                </Link>
              </motion.li>
            );
          })}
        </ul>
      </nav>
      
      {/* Scroll bottom indicator */}
      {showScrollBottom && (
        <div className="px-4 py-1 flex justify-center">
          <button 
            onClick={scrollToBottom}
            className="p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Scroll to bottom"
          >
            <ChevronDown className="h-4 w-4 text-white/60" />
          </button>
        </div>
      )}
      
      {/* Footer section */}
      {isSidebarOpen && (
        <motion.div 
          className="px-4 pt-2 pb-4 border-t border-white/10 flex-shrink-0"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: navItems.length * 0.05 + 0.2 }}
        >
          <p className="text-xs text-center text-gray-500">Synapse v0.1.0</p>
        </motion.div>
      )}
    </aside>
  );
};

export default Sidebar;
