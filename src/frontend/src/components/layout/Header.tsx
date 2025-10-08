import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Moon, Sun, PanelLeft, LogOut, UserCircle, LogIn, UserPlus, Settings as SettingsIcon } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { GlassCard } from "@/components/ui/GlassCard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import useAuthStore from '@/store/authStore';

// Define props for Header
interface HeaderProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ isSidebarOpen, toggleSidebar }) => {
  const { theme, setTheme } = useTheme();
  const { isAuthenticated, user, logout } = useAuthStore();
  const navigate = useNavigate();
  
  // Determine which logo to use based on theme
  const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const logoSrc = isDarkMode ? '/assets/images/synapse-logo-dark.png' : '/assets/images/synapse-logo-light.png';

  const handleSetTheme = (newTheme: "light" | "dark" | "system") => {
    console.log(`Attempting to set theme to: ${newTheme}. Current theme: ${theme}`);
    setTheme(newTheme);
  };

  const handleThemeToggle = () => {
    console.log('Theme toggle clicked! Current theme:', theme);
    const themeOrder: ("light" | "dark" | "system")[] = ["light", "dark", "system"];
    const currentIndex = themeOrder.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themeOrder.length;
    const nextTheme = themeOrder[nextIndex];
    console.log('Switching to theme:', nextTheme);
    setTheme(nextTheme);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header
      className="sticky md:fixed top-0 left-0 right-0 z-50 w-full bg-black/40 md:bg-transparent border-b border-white/10 shadow-lg backdrop-blur-md pb-3 pr-4 md:pr-8 min-h-[64px] overflow-visible"
      style={{
        top: 'env(safe-area-inset-top, 0px)',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)'
      }}
    >
      <div className="w-full pl-3 md:pl-6 flex items-center justify-between h-full max-w-none">
        <div className="flex items-center gap-2">
          {isAuthenticated && (
            <AnimatedButton 
              variant="ghost" 
              size="md" 
              onClick={toggleSidebar} 
              className="border-white/20 hover:bg-white/10 touch-manipulation active:scale-95 transition-transform"
              aria-label="Toggle sidebar menu"
            >
              <PanelLeft className="h-5 w-5 md:h-5 md:w-5" />
              <span className="sr-only">Toggle sidebar</span>
            </AnimatedButton>
          )}
          <Link to={isAuthenticated ? "/dashboard" : "/"} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img 
              src={logoSrc}
              alt="Synapse Logo"
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg transition-all duration-300 hover:scale-105"
              key={logoSrc}
            />
            <span className="text-lg sm:text-xl font-semibold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
              Synapse
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2 md:gap-3 header-buttons">
          <AnimatedButton 
            variant="ghost" 
            size="md"
            className="border-white/20 hover:bg-white/10 flex items-center justify-center w-10 h-10 md:w-12 md:h-12 p-0 touch-manipulation active:scale-95 transition-transform"
            onClick={handleThemeToggle}
            title={`Current theme: ${theme}. Click to cycle through themes.`}
            aria-label="Toggle theme"
          >
            <div className="relative w-5 h-5 md:w-6 md:h-6 flex items-center justify-center">
              <Sun className="h-4 w-4 md:h-5 md:w-5 absolute inset-0 rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0" />
              <Moon className="h-4 w-4 md:h-5 md:w-5 absolute inset-0 rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100" />
            </div>
            <span className="sr-only">Toggle theme</span>
          </AnimatedButton>

          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="relative w-10 h-10 p-0 rounded-full hover:bg-white/10 flex items-center justify-center bg-transparent border border-white/20 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 touch-manipulation active:scale-95">
                <UserCircle className="h-5 w-5 md:h-6 md:w-6 text-purple-300" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 z-[60] bg-black/80 backdrop-blur-md border border-white/10 p-2 mt-2" align="end" forceMount>
                <DropdownMenuItem className="font-normal focus:bg-white/5">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none text-white">
                      {user?.fullName || user?.email || 'User'}
                    </p>
                    {user?.email && (
                      <p className="text-xs leading-none text-gray-400">
                        {user.email}
                      </p>
                    )}
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem onClick={() => navigate('/settings')} className="hover:bg-white/5 cursor-pointer">
                  <SettingsIcon className="mr-2 h-4 w-4 text-gray-300" />
                  <span className="text-gray-200">Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem onClick={handleLogout} className="hover:bg-red-500/10 focus:bg-red-500/20 cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4 text-red-400" />
                  <span className="text-red-300">Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <AnimatedButton variant="ghost" className="border-purple-500/50 text-purple-300 hover:bg-purple-500/20 hover:border-purple-500 glow-effect-purple-sm text-sm md:text-base">
                <Link to="/login">
                  <LogIn className="mr-2 h-4 w-4" /> Login
                </Link>
              </AnimatedButton>
              <AnimatedButton variant="gradient" className="from-pink-500 to-purple-600 glow-effect-md text-sm md:text-base">
                <Link to="/register">
                  <UserPlus className="mr-2 h-4 w-4" /> Register
                </Link>
              </AnimatedButton>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
