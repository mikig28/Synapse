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
} from 'lucide-react';
import { Link } from 'react-router-dom';

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

  return (
    <aside
      className={`
        bg-muted/40 border-r p-4 h-screen sticky top-0 
        transition-all duration-300 ease-in-out 
        ${isSidebarOpen ? 'w-64' : 'w-16'}
      `}
    >
      {/* In a real app, h-screen sticky top-0 might be handled by the parent Layout for better scroll behavior */}
      <div className="mb-4 flex items-center">
        {/* Could add a logo here that also shrinks/hides */}
        <h2 className={`text-lg font-semibold text-foreground overflow-hidden whitespace-nowrap transition-opacity duration-200 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0'}`}>Navigation</h2>
      </div>
      <nav className="flex-grow overflow-y-auto">
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <li key={item.label}>
                <Link to={item.href} className="text-muted-foreground hover:text-foreground transition-colors flex items-center p-2 rounded-md group hover:bg-muted">
                  <IconComponent className={`h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors ${isSidebarOpen ? 'mr-3' : 'mx-auto'}`} />
                  <span className={`overflow-hidden whitespace-nowrap transition-opacity duration-200 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0'}`}>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {/* Add other sidebar content here, like a user profile snippet, later */}
    </aside>
  );
};

export default Sidebar; 