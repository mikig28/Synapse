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
  ChevronRight,
  MapPin,
  Map as MapIcon,
  BookOpen,
  Camera,
  Send,
  UtensilsCrossed,
  Video,
  Crown,
  Zap,
  FolderKanban,
  Workflow,
  Library,
  Pin,
  PinOff,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/components/theme-provider';
import useAuthStore from '@/store/authStore';

// Define props for Sidebar
interface SidebarProps {
  isSidebarOpen: boolean;
  isPinned: boolean;
  togglePin: () => void;
}

interface NavItem {
  href: string;
  label: string;
  icon: any;
  badge?: 'NEW' | 'BETA' | 'PRO';
  adminOnly?: boolean;
}

interface NavSection {
  title: string;
  icon: any;
  items: NavItem[];
  defaultOpen?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isSidebarOpen, isPinned, togglePin }) => {
  const [showScrollTop, setShowScrollTop] = React.useState(false);
  const [showScrollBottom, setShowScrollBottom] = React.useState(false);
  const navRef = React.useRef<HTMLElement>(null);
  const { theme } = useTheme();
  const { isAdmin } = useAuthStore();
  const isAdminUser = isAdmin();

  // Determine which logo to use based on theme
  const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const logoSrc = isDarkMode ? '/assets/images/synapse-logo-dark.png' : '/assets/images/synapse-logo-light.png';

  // Debug log to see if prop is being received
  React.useEffect(() => {
    console.log('[Sidebar] isSidebarOpen:', isSidebarOpen);
  }, [isSidebarOpen]);

  // Core navigation items (always visible)
  const coreItems: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/capture", label: "Capture", icon: Aperture, badge: 'NEW' },
    { href: "/search", label: "Search", icon: Search },
    { href: "/inbox", label: "Inbox", icon: Inbox },
    { href: "/settings", label: "Settings", icon: SettingsIcon },
  ];

  // Organized navigation sections
  const navSections: NavSection[] = React.useMemo(() => [
    {
      title: 'My Work',
      icon: FolderKanban,
      defaultOpen: true,
      items: [
        { href: "/tasks", label: "Tasks", icon: ListChecks },
        { href: "/notes", label: "Notes", icon: FileText },
        { href: "/ideas", label: "Ideas", icon: Lightbulb },
        { href: "/projects", label: "Projects", icon: Briefcase },
        { href: "/calendar", label: "Calendar", icon: CalendarDays },
        { href: "/meetings", label: "Meetings", icon: Mic },
      ],
    },
    {
      title: 'Integrations',
      icon: Zap,
      items: [
        { href: "/whatsapp", label: "WhatsApp", icon: MessageSquare },
        { href: "/whatsapp-monitor", label: "WhatsApp Monitor", icon: Camera },
        { href: "/telegram-channels", label: "Telegram", icon: Send },
        { href: "/bookmarks", label: "Bookmarks", icon: Bookmark },
      ],
    },
    {
      title: 'Automation',
      icon: Workflow,
      items: [
        { href: "/agents", label: "AI Agents", icon: Bot },
        { href: "/scheduled-agents", label: "Scheduled Agents", icon: Clock },
        { href: "/automations", label: "Automations", icon: Repeat },
        { href: "/news", label: "Agent Reports", icon: Newspaper },
      ],
    },
    {
      title: 'Content',
      icon: Library,
      items: [
        { href: "/docs", label: "Documents", icon: BookOpen },
        { href: "/images", label: "Images", icon: ImageIcon },
        { href: "/videos", label: "Videos", icon: Youtube },
        { href: "/recipes", label: "Recipes", icon: UtensilsCrossed },
        { href: "/reels-stories", label: "Reels & Stories", icon: Video },
      ],
    },
    {
      title: 'Advanced',
      icon: Target,
      items: [
        { href: "/places", label: "Places", icon: MapIcon },
        { href: "/planning", label: "Planning", icon: Plane },
        { href: "/goals", label: "Goals", icon: Target },
        { href: "/habits", label: "Habits", icon: Repeat },
        { href: "/news-hub", label: "News Hub", icon: Newspaper },
        ...(isAdminUser ? [{ href: "/admin", label: "Admin Dashboard", icon: Crown, adminOnly: true }] : []),
      ],
    },
  ], [isAdminUser]);
  const [openSections, setOpenSections] = React.useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    navSections.forEach(section => {
      initial[section.title] = section.defaultOpen ?? false;
    });
    return initial;
  });

  React.useEffect(() => {
    setOpenSections(prev => {
      const next: Record<string, boolean> = {};
      let changed = false;

      navSections.forEach(section => {
        const prevValue = prev[section.title];
        const value = prevValue ?? (section.defaultOpen ?? false);
        next[section.title] = value;
        if (prevValue !== value) {
          changed = true;
        }
      });

      const prevKeys = Object.keys(prev);
      if (prevKeys.length !== navSections.length) {
        changed = true;
      } else {
        for (const key of prevKeys) {
          if (!(key in next)) {
            changed = true;
            break;
          }
        }
      }

      return changed ? next : prev;
    });
  }, [navSections]);

  const toggleSection = (sectionTitle: string) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionTitle]: !(prev[sectionTitle] ?? false),
    }));
  };

  const handleExpandAll = React.useCallback(() => {
    const expanded: Record<string, boolean> = {};
    navSections.forEach(section => {
      expanded[section.title] = true;
    });
    setOpenSections(expanded);
  }, [navSections]);

  const handleCollapseAll = React.useCallback(() => {
    const collapsed: Record<string, boolean> = {};
    navSections.forEach(section => {
      collapsed[section.title] = false;
    });
    setOpenSections(collapsed);
  }, [navSections]);

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
        ${isSidebarOpen ? 'flex' : 'hidden'} md:flex
        flex-col bg-gray-900 backdrop-blur-sm border-r border-white/10
        transition-all duration-300 ease-in-out will-change-transform

        /* DESKTOP (≥ md) ----------------------------------- */
        md:fixed md:top-[64px] md:left-0 md:z-40
        md:h-[calc(100vh-64px)] md:max-h-[calc(100vh-64px)] md:overflow-hidden
        ${isSidebarOpen ? 'md:w-64' : 'md:w-20'}

        /* MOBILE (< md) ------------------------------------ */
        fixed top-[calc(64px_+_var(--safe-area-inset-top,_0px))] left-0
        h-[calc(100dvh_-_64px_-_var(--safe-area-inset-top,_0px))] w-64 z-50
        ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}

        /* Mobile optimizations for better clarity */
        md:bg-gray-900/95 md:backdrop-blur-md
        supports-[backdrop-filter]:md:bg-gray-900/90
        supports-[backdrop-filter]:md:backdrop-blur-lg
      `}
      style={{ pointerEvents: isSidebarOpen ? 'auto' : undefined }}
      aria-label="Primary"
    >
      {/* Header section - fixed height */}
      <div className={`px-4 pt-4 pb-2 flex items-center flex-shrink-0 ${isSidebarOpen ? 'justify-between' : 'justify-center'}`}>
        {/* Synapse Logo/Icon - visible when open, tiny icon when closed */}
        <Link to="/dashboard" className="flex items-center gap-2">
          <motion.img
            src={logoSrc}
            alt="Synapse Logo"
            className="rounded-lg transition-all duration-300"
            style={{
              width: isSidebarOpen ? '48px' : '32px',
              height: isSidebarOpen ? '48px' : '32px',
            }}
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.3 }}
            key={logoSrc}
          />
          {isSidebarOpen && (
            <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent whitespace-nowrap ml-2">
              Synapse
            </h2>
          )}
        </Link>

        {/* Pin button - only visible when sidebar is open */}
        {isSidebarOpen && (
          <motion.button
            onClick={togglePin}
            className={`
              p-2 rounded-lg transition-all duration-200
              ${isPinned
                ? 'bg-purple-500/30 text-purple-300 hover:bg-purple-500/40'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
              }
            `}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label={isPinned ? "Unpin sidebar" : "Pin sidebar"}
            title={isPinned ? "Unpin sidebar (collapse on navigation)" : "Pin sidebar (keep open)"}
          >
            {isPinned ? (
              <Pin className="h-4 w-4" />
            ) : (
              <PinOff className="h-4 w-4" />
            )}
          </motion.button>
        )}
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
        {/* Core Navigation Items (Always visible) */}
        <ul className="flex flex-col gap-1 md:gap-2 py-2 mb-4">
          {coreItems.map((item, index) => {
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
                    flex items-center p-2 md:p-3 rounded-lg group transition-all duration-200 ease-in-out w-full
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
                  `} />
                  {isSidebarOpen && (
                    <span className="text-sm font-medium whitespace-nowrap ml-3 flex-1">
                      {item.label}
                    </span>
                  )}
                  {isSidebarOpen && item.badge && (
                    <span className={`
                      text-[10px] px-2 py-0.5 rounded-full font-semibold
                      ${item.badge === 'NEW' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : ''}
                      ${item.badge === 'BETA' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : ''}
                      ${item.badge === 'PRO' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : ''}
                    `}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              </motion.li>
            );
          })}
        </ul>

        {isSidebarOpen && (
          <div className="flex items-center gap-2 mb-4 text-xs font-medium text-white/80">
            <button
              type="button"
              onClick={handleExpandAll}
              className="flex-1 px-2 py-1 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 hover:text-white transition-colors"
              aria-label="Expand all sections"
            >
              Expand All
            </button>
            <button
              type="button"
              onClick={handleCollapseAll}
              className="flex-1 px-2 py-1 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 hover:text-white transition-colors"
              aria-label="Collapse all sections"
            >
              Collapse All
            </button>
          </div>
        )}

        {/* Collapsible Sections */}
        <div className="space-y-2">
          {navSections.map((section, sectionIndex) => {
            const SectionIcon = section.icon;
            const isOpen = openSections[section.title] ?? false;
            const hasActiveItem = section.items.some(item => location.pathname.startsWith(item.href));

            return (
              <div key={section.title} className="space-y-1">
                {/* Section Header */}
                <button
                  onClick={() => toggleSection(section.title)}
                  className={`
                    w-full flex items-center p-2 md:p-3 rounded-lg group transition-all duration-200 ease-in-out
                    ${isSidebarOpen ? 'justify-between' : 'justify-center'}
                    ${hasActiveItem
                      ? 'bg-white/5 text-purple-300'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }
                  `}
                >
                  <div className="flex items-center gap-2">
                    <SectionIcon className="h-4 w-4 flex-shrink-0" />
                    {isSidebarOpen && (
                      <span className="text-xs font-semibold uppercase tracking-wider">
                        {section.title}
                      </span>
                    )}
                  </div>
                  {isSidebarOpen && (
                    <ChevronRight
                      className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
                    />
                  )}
                </button>

                {/* Section Items */}
                <AnimatePresence>
                  {(isOpen || !isSidebarOpen) && (
                    <motion.ul
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col gap-1 pl-2 overflow-hidden"
                    >
                      {section.items.map((item, itemIndex) => {
                        const IconComponent = item.icon;
                        const isActive = location.pathname.startsWith(item.href);
                        const isAdminLink = item.adminOnly === true;
                        return (
                          <motion.li
                            key={item.label}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ delay: itemIndex * 0.03 }}
                          >
                            <Link
                              to={item.href}
                              className={`
                                flex items-center p-2 md:p-2.5 rounded-lg group transition-all duration-200 ease-in-out w-full
                                ${isSidebarOpen ? 'justify-start' : 'justify-center'}
                                ${isActive
                                  ? isAdminLink
                                    ? 'bg-gradient-to-r from-yellow-500/30 to-orange-500/30 text-white shadow-md border border-yellow-400/40'
                                    : 'bg-gradient-to-r from-pink-500/30 to-purple-500/30 text-white shadow-md border border-white/20'
                                  : isAdminLink
                                    ? 'text-yellow-300 hover:text-yellow-100 hover:bg-yellow-500/10'
                                    : 'text-gray-300 hover:text-white hover:bg-white/8'
                                }
                              `}
                            >
                              <IconComponent className={`
                                h-4 w-4 md:h-4 md:w-4 transition-colors duration-200 flex-shrink-0
                                ${isActive
                                  ? isAdminLink ? 'text-yellow-300' : 'text-white'
                                  : isAdminLink ? 'text-yellow-400 group-hover:text-yellow-200' : 'text-gray-400 group-hover:text-purple-300'
                                }
                              `} />
                              {isSidebarOpen && (
                                <span className={`text-sm font-medium whitespace-nowrap ml-3 flex-1 ${isAdminLink ? 'font-semibold' : ''}`}>
                                  {item.label}
                                </span>
                              )}
                              {isSidebarOpen && item.badge && (
                                <span className={`
                                  text-[10px] px-2 py-0.5 rounded-full font-semibold
                                  ${item.badge === 'NEW' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : ''}
                                  ${item.badge === 'BETA' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : ''}
                                  ${item.badge === 'PRO' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : ''}
                                `}>
                                  {item.badge}
                                </span>
                              )}
                            </Link>
                          </motion.li>
                        );
                      })}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
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
          transition={{ delay: coreItems.length * 0.05 + 0.2 }}
        >
          <p className="text-xs text-center text-gray-500">Synapse v0.1.0</p>
        </motion.div>
      )}
    </aside>
  );
};

export default Sidebar;
