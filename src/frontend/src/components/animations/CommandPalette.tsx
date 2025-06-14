import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Command, Search, ArrowRight, Hash, FileText, Settings, Users, Calendar, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FloatingInput } from './FloatingInput';

interface CommandItem {
  id: string;
  title: string;
  description?: string;
  icon: React.ReactNode;
  category: string;
  keywords: string[];
  action: () => void;
  shortcut?: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands?: CommandItem[];
}

const defaultCommands: CommandItem[] = [
  {
    id: 'dashboard',
    title: 'Go to Dashboard',
    description: 'View your main dashboard',
    icon: <Hash className="w-4 h-4" />,
    category: 'Navigation',
    keywords: ['dashboard', 'home', 'main'],
    action: () => console.log('Navigate to dashboard'),
  },
  {
    id: 'notes',
    title: 'Create New Note',
    description: 'Start writing a new note',
    icon: <FileText className="w-4 h-4" />,
    category: 'Actions',
    keywords: ['note', 'create', 'write', 'new'],
    action: () => console.log('Create new note'),
    shortcut: '⌘N',
  },
  {
    id: 'settings',
    title: 'Open Settings',
    description: 'Configure your preferences',
    icon: <Settings className="w-4 h-4" />,
    category: 'Navigation',
    keywords: ['settings', 'preferences', 'config'],
    action: () => console.log('Open settings'),
    shortcut: '⌘,',
  },
  {
    id: 'team',
    title: 'Invite Team Member',
    description: 'Send an invitation to join',
    icon: <Users className="w-4 h-4" />,
    category: 'Actions',
    keywords: ['team', 'invite', 'member', 'collaborate'],
    action: () => console.log('Invite team member'),
  },
  {
    id: 'calendar',
    title: 'Schedule Meeting',
    description: 'Create a new calendar event',
    icon: <Calendar className="w-4 h-4" />,
    category: 'Actions',
    keywords: ['calendar', 'meeting', 'schedule', 'event'],
    action: () => console.log('Schedule meeting'),
  },
];

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  commands = defaultCommands,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filteredCommands, setFilteredCommands] = useState(commands);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Fuzzy search function
  const fuzzySearch = useCallback((items: CommandItem[], searchQuery: string) => {
    if (!searchQuery.trim()) return items;

    const query = searchQuery.toLowerCase();
    
    return items
      .map(item => {
        const titleMatch = item.title.toLowerCase().includes(query);
        const descriptionMatch = item.description?.toLowerCase().includes(query);
        const keywordMatch = item.keywords.some(keyword => 
          keyword.toLowerCase().includes(query)
        );
        const categoryMatch = item.category.toLowerCase().includes(query);

        let score = 0;
        if (titleMatch) score += 10;
        if (descriptionMatch) score += 5;
        if (keywordMatch) score += 3;
        if (categoryMatch) score += 2;

        return { ...item, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score);
  }, []);

  // Update filtered commands when query changes
  useEffect(() => {
    const filtered = fuzzySearch(commands, query);
    setFilteredCommands(filtered);
    setSelectedIndex(0);
  }, [query, commands, fuzzySearch]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < filteredCommands.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : filteredCommands.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
            onClose();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        });
      }
    }
  }, [selectedIndex]);

  const handleItemClick = (command: CommandItem) => {
    command.action();
    onClose();
  };

  const groupedCommands = filteredCommands.reduce((acc, command) => {
    if (!acc[command.category]) {
      acc[command.category] = [];
    }
    acc[command.category].push(command);
    return acc;
  }, {} as Record<string, CommandItem[]>);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Command Palette */}
          <motion.div
            className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-2xl mx-4 z-50"
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <div className="glass rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-3 p-4 border-b border-white/10">
                <Command className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Type a command or search..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full bg-transparent text-lg placeholder:text-muted-foreground focus:outline-none"
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  ESC to close
                </div>
              </div>

              {/* Results */}
              <div 
                ref={listRef}
                className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/20"
              >
                {filteredCommands.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No commands found</p>
                    <p className="text-sm">Try a different search term</p>
                  </div>
                ) : (
                  <div className="p-2">
                    {Object.entries(groupedCommands).map(([category, items]) => (
                      <div key={category} className="mb-4 last:mb-0">
                        <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {category}
                        </div>
                        <div className="space-y-1">
                          {items.map((command, index) => {
                            const globalIndex = filteredCommands.indexOf(command);
                            const isSelected = globalIndex === selectedIndex;
                            
                            return (
                              <motion.div
                                key={command.id}
                                className={cn(
                                  "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                                  isSelected 
                                    ? "bg-primary/20 text-primary" 
                                    : "hover:bg-white/5"
                                )}
                                onClick={() => handleItemClick(command)}
                                whileHover={{ x: 2 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <div className={cn(
                                  "p-2 rounded-md",
                                  isSelected ? "bg-primary/30" : "bg-white/10"
                                )}>
                                  {command.icon}
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium truncate">
                                    {command.title}
                                  </div>
                                  {command.description && (
                                    <div className="text-sm text-muted-foreground truncate">
                                      {command.description}
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center gap-2">
                                  {command.shortcut && (
                                    <div className="px-2 py-1 text-xs bg-white/10 rounded border border-white/20">
                                      {command.shortcut}
                                    </div>
                                  )}
                                  <ArrowRight className="w-4 h-4 opacity-50" />
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between p-3 border-t border-white/10 text-xs text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span>↑↓ Navigate</span>
                  <span>↵ Select</span>
                  <span>ESC Close</span>
                </div>
                <div className="flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  <span>Quick Actions</span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Hook for command palette
export const useCommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen(!isOpen),
  };
}; 