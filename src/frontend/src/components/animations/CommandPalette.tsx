import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Command,
  Search,
  ArrowRight,
  Hash,
  FileText,
  Settings,
  Calendar,
  Zap,
  StickyNote,
  Bookmark,
  CheckSquare,
  Lightbulb,
  Video,
  Newspaper,
  MessageSquare,
  Users,
  Home,
  Inbox,
  MapPin,
  Plus,
  Clock,
  Loader2,
  Image,
  Send
} from 'lucide-react';
import { cn } from '@/lib/utils';
import searchService, { SearchResult } from '@/services/searchService';
import { useCommandPaletteStore } from '@/store/commandPaletteStore';

interface CommandItem {
  id: string;
  title: string;
  description?: string;
  icon: React.ReactNode;
  category: string;
  keywords: string[];
  action: () => void;
  shortcut?: string;
  score?: number;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands?: CommandItem[];
}

// Helper function to generate navigation commands
const useNavigationCommands = (navigate: ReturnType<typeof useNavigate>, onClose: () => void): CommandItem[] => {
  return [
    {
      id: 'nav-dashboard',
      title: 'Dashboard',
      description: 'View your main dashboard',
      icon: <Home className="w-4 h-4" />,
      category: 'Navigation',
      keywords: ['dashboard', 'home', 'main', 'overview'],
      action: () => {
        navigate('/dashboard');
        onClose();
      },
    },
    {
      id: 'nav-search',
      title: 'Universal Search',
      description: 'Search across all content',
      icon: <Search className="w-4 h-4" />,
      category: 'Navigation',
      keywords: ['search', 'find', 'lookup'],
      action: () => {
        navigate('/search');
        onClose();
      },
    },
    {
      id: 'nav-notes',
      title: 'Notes',
      description: 'View and manage your notes',
      icon: <StickyNote className="w-4 h-4" />,
      category: 'Navigation',
      keywords: ['notes', 'writing', 'documents'],
      action: () => {
        navigate('/notes');
        onClose();
      },
    },
    {
      id: 'nav-tasks',
      title: 'Tasks',
      description: 'Manage your tasks',
      icon: <CheckSquare className="w-4 h-4" />,
      category: 'Navigation',
      keywords: ['tasks', 'todo', 'checklist'],
      action: () => {
        navigate('/tasks');
        onClose();
      },
    },
    {
      id: 'nav-bookmarks',
      title: 'Bookmarks',
      description: 'View saved bookmarks',
      icon: <Bookmark className="w-4 h-4" />,
      category: 'Navigation',
      keywords: ['bookmarks', 'saved', 'links'],
      action: () => {
        navigate('/bookmarks');
        onClose();
      },
    },
    {
      id: 'nav-ideas',
      title: 'Ideas',
      description: 'Browse your ideas',
      icon: <Lightbulb className="w-4 h-4" />,
      category: 'Navigation',
      keywords: ['ideas', 'thoughts', 'inspiration'],
      action: () => {
        navigate('/ideas');
        onClose();
      },
    },
    {
      id: 'nav-videos',
      title: 'Videos',
      description: 'View video library',
      icon: <Video className="w-4 h-4" />,
      category: 'Navigation',
      keywords: ['videos', 'media', 'watch'],
      action: () => {
        navigate('/videos');
        onClose();
      },
    },
    {
      id: 'nav-news',
      title: 'Agents Report',
      description: 'View AI agents news reports',
      icon: <Newspaper className="w-4 h-4" />,
      category: 'Navigation',
      keywords: ['news', 'agents', 'report', 'articles', 'updates', 'ai'],
      action: () => {
        navigate('/news');
        onClose();
      },
    },
    {
      id: 'nav-news-hub',
      title: 'News Hub',
      description: 'Browse and manage news sources',
      icon: <Newspaper className="w-4 h-4" />,
      category: 'Navigation',
      keywords: ['news', 'hub', 'sources', 'feed', 'articles', 'reading'],
      action: () => {
        navigate('/news-hub');
        onClose();
      },
    },
    {
      id: 'nav-calendar',
      title: 'Calendar',
      description: 'View your calendar',
      icon: <Calendar className="w-4 h-4" />,
      category: 'Navigation',
      keywords: ['calendar', 'schedule', 'events'],
      action: () => {
        navigate('/calendar');
        onClose();
      },
    },
    {
      id: 'nav-meetings',
      title: 'Meetings',
      description: 'View meeting records',
      icon: <Users className="w-4 h-4" />,
      category: 'Navigation',
      keywords: ['meetings', 'calls', 'conferences'],
      action: () => {
        navigate('/meetings');
        onClose();
      },
    },
    {
      id: 'nav-agents',
      title: 'AI Agents',
      description: 'Manage AI agents',
      icon: <Zap className="w-4 h-4" />,
      category: 'Navigation',
      keywords: ['agents', 'ai', 'automation'],
      action: () => {
        navigate('/agents');
        onClose();
      },
    },
    {
      id: 'nav-inbox',
      title: 'Inbox',
      description: 'View your inbox',
      icon: <Inbox className="w-4 h-4" />,
      category: 'Navigation',
      keywords: ['inbox', 'messages', 'notifications'],
      action: () => {
        navigate('/inbox');
        onClose();
      },
    },
    {
      id: 'nav-places',
      title: 'Places',
      description: 'Explore saved places',
      icon: <MapPin className="w-4 h-4" />,
      category: 'Navigation',
      keywords: ['places', 'maps', 'locations'],
      action: () => {
        navigate('/places');
        onClose();
      },
    },
    {
      id: 'nav-docs',
      title: 'Documents',
      description: 'View documents',
      icon: <FileText className="w-4 h-4" />,
      category: 'Navigation',
      keywords: ['documents', 'files', 'docs'],
      action: () => {
        navigate('/docs');
        onClose();
      },
    },
    {
      id: 'nav-images',
      title: 'Images',
      description: 'View and manage images',
      icon: <Image className="w-4 h-4" />,
      category: 'Navigation',
      keywords: ['images', 'photos', 'pictures', 'gallery', 'media'],
      action: () => {
        navigate('/images');
        onClose();
      },
    },
    {
      id: 'nav-whatsapp',
      title: 'WhatsApp',
      description: 'WhatsApp integration and messages',
      icon: <MessageSquare className="w-4 h-4" />,
      category: 'Navigation',
      keywords: ['whatsapp', 'messages', 'chat', 'messaging'],
      action: () => {
        navigate('/whatsapp');
        onClose();
      },
    },
    {
      id: 'nav-whatsapp-monitor',
      title: 'WhatsApp Monitor',
      description: 'Monitor WhatsApp groups and summaries',
      icon: <Users className="w-4 h-4" />,
      category: 'Navigation',
      keywords: ['whatsapp', 'monitor', 'groups', 'summaries', 'tracking'],
      action: () => {
        navigate('/whatsapp-monitor');
        onClose();
      },
    },
    {
      id: 'nav-telegram-channels',
      title: 'Telegram Channels',
      description: 'Manage Telegram channels and messages',
      icon: <Send className="w-4 h-4" />,
      category: 'Navigation',
      keywords: ['telegram', 'channels', 'messages', 'chat', 'messaging'],
      action: () => {
        navigate('/telegram-channels');
        onClose();
      },
    },
    {
      id: 'nav-settings',
      title: 'Settings',
      description: 'Configure your preferences',
      icon: <Settings className="w-4 h-4" />,
      category: 'Navigation',
      keywords: ['settings', 'preferences', 'config'],
      action: () => {
        navigate('/settings');
        onClose();
      },
      shortcut: '⌘,',
    },
  ];
};

// Helper function to generate quick action commands
const useQuickActionCommands = (navigate: ReturnType<typeof useNavigate>, onClose: () => void): CommandItem[] => {
  return [
    {
      id: 'action-new-note',
      title: 'Create New Note',
      description: 'Start writing a new note',
      icon: <Plus className="w-4 h-4" />,
      category: 'Quick Actions',
      keywords: ['create', 'new', 'note', 'write'],
      action: () => {
        navigate('/notes?new=true');
        onClose();
      },
      shortcut: '⌘N',
    },
    {
      id: 'action-new-task',
      title: 'Create New Task',
      description: 'Add a new task',
      icon: <Plus className="w-4 h-4" />,
      category: 'Quick Actions',
      keywords: ['create', 'new', 'task', 'todo'],
      action: () => {
        navigate('/tasks?new=true');
        onClose();
      },
      shortcut: '⌘T',
    },
    {
      id: 'action-new-bookmark',
      title: 'Add Bookmark',
      description: 'Save a new bookmark',
      icon: <Plus className="w-4 h-4" />,
      category: 'Quick Actions',
      keywords: ['add', 'new', 'bookmark', 'save'],
      action: () => {
        navigate('/bookmarks?new=true');
        onClose();
      },
      shortcut: '⌘B',
    },
    {
      id: 'action-new-idea',
      title: 'Capture Idea',
      description: 'Save a new idea',
      icon: <Plus className="w-4 h-4" />,
      category: 'Quick Actions',
      keywords: ['create', 'new', 'idea', 'thought'],
      action: () => {
        navigate('/ideas?new=true');
        onClose();
      },
    },
  ];
};

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  commands,
}) => {
  const navigate = useNavigate();
  const { addRecentSearch, getRecentSearches, addRecentItem, getRecentItems } = useCommandPaletteStore();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filteredCommands, setFilteredCommands] = useState<CommandItem[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Only generate commands when palette is open - performance optimization
  const navigationCommands = React.useMemo(() =>
    isOpen ? useNavigationCommands(navigate, onClose) : [],
    [isOpen, navigate, onClose]
  );
  const quickActionCommands = React.useMemo(() =>
    isOpen ? useQuickActionCommands(navigate, onClose) : [],
    [isOpen, navigate, onClose]
  );

  // Helper to get icon for search result type
  const getResultIcon = (type: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      document: <FileText className="w-4 h-4" />,
      note: <StickyNote className="w-4 h-4" />,
      bookmark: <Bookmark className="w-4 h-4" />,
      task: <CheckSquare className="w-4 h-4" />,
      idea: <Lightbulb className="w-4 h-4" />,
      video: <Video className="w-4 h-4" />,
      news: <Newspaper className="w-4 h-4" />,
      whatsapp: <MessageSquare className="w-4 h-4" />,
      telegram: <MessageSquare className="w-4 h-4" />,
      meeting: <Users className="w-4 h-4" />,
    };
    return iconMap[type] || <FileText className="w-4 h-4" />;
  };

  // Convert search results to command items
  const searchResultsToCommands = useCallback((results: SearchResult[]): CommandItem[] => {
    return results.map(result => ({
      id: `search-${result.id}`,
      title: result.title,
      description: result.excerpt,
      icon: getResultIcon(result.type),
      category: 'Search Results',
      keywords: [result.type, result.title.toLowerCase()],
      score: result.score,
      action: () => {
        // Handle images with public URLs - open in new tab
        if (result.type === 'image' && result.metadata?.publicUrl) {
          window.open(result.metadata.publicUrl, '_blank', 'noopener,noreferrer');
          onClose();
          return;
        }

        const pathMap: Record<string, string> = {
          bookmark: `/bookmarks?highlight=${result.id}`,
          document: `/docs?highlight=${result.id}`,
          note: `/notes?highlight=${result.id}`,
          task: `/tasks?highlight=${result.id}`,
          idea: `/ideas?highlight=${result.id}`,
          video: `/videos?highlight=${result.id}`,
          image: `/images?highlight=${result.id}`,
          news: `/news?highlight=${result.id}`,
          meeting: `/meetings?highlight=${result.id}`,
          whatsapp: `/agents?type=whatsapp&highlight=${result.id}`,
          telegram: `/agents?type=telegram&highlight=${result.id}`,
        };

        const path = pathMap[result.type] || '/dashboard';
        addRecentItem({
          id: result.id,
          title: result.title,
          type: result.type,
          path,
        });
        navigate(path);
        onClose();
      },
    }));
  }, [navigate, onClose, addRecentItem]);

  // Fuzzy search function for static commands
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
      .filter(item => (item.score || 0) > 0)
      .sort((a, b) => (b.score || 0) - (a.score || 0));
  }, []);

  // Debounced search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    try {
      const results = await searchService.universalSearch({
        query: searchQuery,
        strategy: 'hybrid',
        limit: 10,
      });

      setSearchResults(results.results);
      addRecentSearch(searchQuery);
    } catch (error) {
      console.error('Command palette search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [addRecentSearch]);

  // Update filtered commands when query changes - only when palette is open
  useEffect(() => {
    if (!isOpen) return; // Skip processing if palette is closed

    const allCommands = commands || [...navigationCommands, ...quickActionCommands];

    if (!query.trim()) {
      // Show recent items and navigation when no query
      const recentItems = getRecentItems(5);
      const recentCommands: CommandItem[] = recentItems.map(item => ({
        id: `recent-${item.id}`,
        title: item.title,
        description: `Recently viewed ${item.type}`,
        icon: getResultIcon(item.type),
        category: 'Recent',
        keywords: [item.type],
        action: () => {
          navigate(item.path);
          onClose();
        },
      }));

      setFilteredCommands([...recentCommands, ...allCommands]);
      setSearchResults([]);
      setSelectedIndex(0);
      return;
    }

    // Filter static commands
    const filtered = fuzzySearch(allCommands, query);
    setFilteredCommands(filtered);
    setSelectedIndex(0);

    // Debounced search for actual content
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [isOpen, query, commands, navigationCommands, quickActionCommands, fuzzySearch, performSearch, getRecentItems, navigate, onClose]);

  // Combine all available commands
  const allAvailableCommands = React.useMemo(() => {
    if (!isOpen) return []; // Skip if not open
    const searchCommands = searchResultsToCommands(searchResults);
    return [...filteredCommands, ...searchCommands];
  }, [isOpen, filteredCommands, searchResults, searchResultsToCommands]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev =>
            prev < allAvailableCommands.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev =>
            prev > 0 ? prev - 1 : allAvailableCommands.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (allAvailableCommands[selectedIndex]) {
            allAvailableCommands[selectedIndex].action();
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
  }, [isOpen, allAvailableCommands, selectedIndex, onClose]);

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
  };

  const groupedCommands = allAvailableCommands.reduce((acc, command) => {
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
                {isSearching ? (
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                ) : (
                  <Command className="w-5 h-5 text-primary" />
                )}
                <div className="flex-1">
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search or type a command..."
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
                {allAvailableCommands.length === 0 && !isSearching ? (
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
                          {category === 'Search Results' && isSearching && (
                            <span className="ml-2 text-primary">
                              <Loader2 className="inline w-3 h-3 animate-spin" />
                            </span>
                          )}
                        </div>
                        <div className="space-y-1">
                          {items.map((command, index) => {
                            const globalIndex = allAvailableCommands.indexOf(command);
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

// Hook for command palette with global shortcuts
export const useCommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command Palette toggle (Cmd/Ctrl+K)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        return;
      }

      // Quick action shortcuts (only when command palette is closed)
      if (!isOpen && (e.metaKey || e.ctrlKey)) {
        switch (e.key) {
          case 'n':
            e.preventDefault();
            navigate('/notes?new=true');
            break;
          case 'b':
            e.preventDefault();
            navigate('/bookmarks?new=true');
            break;
          case 't':
            e.preventDefault();
            navigate('/tasks?new=true');
            break;
          case ',':
            e.preventDefault();
            navigate('/settings');
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, navigate]);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen(!isOpen),
  };
}; 