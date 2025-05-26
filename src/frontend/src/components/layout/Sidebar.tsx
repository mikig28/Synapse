import React from 'react';
import {
  LayoutDashboard,
  Inbox,
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
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

// Define props for Sidebar
interface SidebarProps {
  isSidebarOpen: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isSidebarOpen }) => {
  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/inbox", label: "Inbox", icon: Inbox },
    { href: "/images", label: "Images", icon: ImageIcon },
    { href: "/capture", label: "Capture", icon: Aperture }, 
    { href: "/projects", label: "Projects", icon: Briefcase }, 
    { href: "/tasks", label: "Tasks", icon: ListChecks },
    { href: "/notes", label: "Notes", icon: FileText },
    { href: "/ideas", label: "Ideas", icon: Lightbulb },
    { href: "/meetings", label: "Meetings", icon: Mic },
    { href: "/calendar", label: "Calendar", icon: CalendarDays }, 
    { href: "/planning", label: "Planning", icon: Plane }, 
    { href: "/goals", label: "Goals", icon: Target }, 
    { href: "/habits", label: "Habits", icon: Repeat }, 
    { href: "/automations", label: "Automations", icon: Bot }, 
    { href: "/whatsapp", label: "WhatsApp", icon: MessageSquare }, 
    { href: "/bookmarks", label: "Bookmarks", icon: Bookmark },
    { href: "/videos", label: "Videos", icon: Youtube },
    { href: "/news", label: "News", icon: Newspaper }, 
    { href: "/settings", label: "Settings", icon: SettingsIcon },
  ];

  const location = useLocation();

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
        bg-gray-900 backdrop-blur-sm border-r border-white/10 p-4
        
        /* DESKTOP (≥ md) ----------------------------------- */
        md:block md:sticky md:top-0 
        ${isSidebarOpen ? "md:w-64" : "md:w-20"}
        md:h-screen

        /* MOBILE (< md) ------------------------------------ */
        fixed top-0 left-0 md:relative h-dvh 
        transition-all duration-300 ease-in-out 
        ${isSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}
        w-64
        
        /* Mobile optimizations for better clarity */
        md:bg-gray-900/95 md:backdrop-blur-md
        supports-[backdrop-filter]:md:bg-gray-900/90
        supports-[backdrop-filter]:md:backdrop-blur-lg
      `}
      aria-label="Primary"
    >
      <div className="mb-6 flex items-center justify-center pt-2">
        {/* Synapse Logo/Icon - visible when open, tiny icon when closed */}
        <Link to="/dashboard" className="flex items-center gap-2">
          <motion.svg 
            width={isSidebarOpen ? "32" : "24"} 
            height={isSidebarOpen ? "32" : "24"} 
            viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
            className="text-purple-400 transition-all duration-300"
            animate={{ rotate: isSidebarOpen ? 0 : 360 }}
            transition={{ duration: 0.5 }}
          >
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </motion.svg>
          <h2 className={`text-xl md:text-2xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent overflow-hidden whitespace-nowrap transition-all duration-300 ${isSidebarOpen ? 'opacity-100 w-auto ml-2' : 'opacity-0 w-0 ml-0'}`}>
            Synapse
          </h2>
        </Link>
      </div>
      <nav className="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent pr-1">
        <ul className="flex flex-col gap-1 md:gap-2">
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
                  <span className={`text-sm font-medium overflow-hidden whitespace-nowrap transition-all duration-300 ${isSidebarOpen ? 'opacity-100 max-w-full' : 'opacity-0 max-w-0'}`}>
                    {item.label}
                  </span>
                </Link>
              </motion.li>
            );
          })}
        </ul>
      </nav>
      {/* Placeholder for potential future elements like user profile snippet */}
      {isSidebarOpen && (
        <motion.div 
          className="mt-auto pt-4 border-t border-white/10"
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
