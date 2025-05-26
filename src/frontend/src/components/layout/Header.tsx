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

  const handleSetTheme = (newTheme: "light" | "dark" | "system") => {
    console.log(`Attempting to set theme to: ${newTheme}. Current theme: ${theme}`);
    setTheme(newTheme);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-transparent border-b border-white/10 shadow-lg backdrop-blur-md py-3 pr-8 sticky top-0 z-50 min-h-[64px] overflow-visible">
      <div className="w-full pl-6 flex items-center justify-between h-full max-w-none">
        <div className="flex items-center gap-2">
          {isAuthenticated && (
            <AnimatedButton variant="ghost" size="md" onClick={toggleSidebar} className="border-white/20 hover:bg-white/10">
              <PanelLeft className="h-5 w-5" />
              <span className="sr-only">Toggle sidebar</span>
            </AnimatedButton>
          )}
          <Link to={isAuthenticated ? "/dashboard" : "/"} className="text-xl font-semibold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent hover:opacity-80 transition-opacity">
            Synapse
          </Link>
        </div>

        <div className="flex items-center gap-3 header-buttons">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <AnimatedButton 
                variant="ghost" 
                size="md"
                className="border-white/20 hover:bg-white/10 flex items-center justify-center w-12 h-12 p-0"
              >
                <div className="relative w-6 h-6 flex items-center justify-center">
                  <Sun className="h-5 w-5 absolute inset-0 rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0" />
                  <Moon className="h-5 w-5 absolute inset-0 rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100" />
                </div>
                <span className="sr-only">Toggle theme</span>
              </AnimatedButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-[60]">
              <DropdownMenuItem onClick={() => handleSetTheme("light")} className="cursor-pointer">
                Light
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSetTheme("dark")} className="cursor-pointer">
                Dark
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSetTheme("system")} className="cursor-pointer">
                System
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <AnimatedButton variant="ghost" className="relative w-10 h-10 p-0 rounded-full hover:bg-white/10 flex items-center justify-center">
                  <UserCircle className="h-6 w-6 text-purple-300" />
                </AnimatedButton>
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
              <AnimatedButton variant="ghost" className="border-purple-500/50 text-purple-300 hover:bg-purple-500/20 hover:border-purple-500 glow-effect-purple-sm">
                <Link to="/login">
                  <LogIn className="mr-2 h-4 w-4" /> Login
                </Link>
              </AnimatedButton>
              <AnimatedButton variant="gradient" className="from-pink-500 to-purple-600 glow-effect-md">
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
