import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface RecentSearch {
  query: string;
  timestamp: number;
}

interface RecentItem {
  id: string;
  title: string;
  type: string;
  path: string;
  timestamp: number;
}

interface CommandPaletteStore {
  recentSearches: RecentSearch[];
  recentItems: RecentItem[];
  addRecentSearch: (query: string) => void;
  addRecentItem: (item: Omit<RecentItem, 'timestamp'>) => void;
  clearRecentSearches: () => void;
  clearRecentItems: () => void;
  getRecentSearches: (limit?: number) => string[];
  getRecentItems: (limit?: number) => RecentItem[];
}

export const useCommandPaletteStore = create<CommandPaletteStore>()(
  persist(
    (set, get) => ({
      recentSearches: [],
      recentItems: [],

      addRecentSearch: (query: string) => {
        if (!query.trim()) return;

        set((state) => {
          // Remove duplicate if exists
          const filtered = state.recentSearches.filter((s) => s.query !== query);

          // Add new search at the beginning
          const updated = [
            { query, timestamp: Date.now() },
            ...filtered,
          ].slice(0, 10); // Keep only last 10 searches

          return { recentSearches: updated };
        });
      },

      addRecentItem: (item: Omit<RecentItem, 'timestamp'>) => {
        set((state) => {
          // Remove duplicate if exists
          const filtered = state.recentItems.filter((i) => i.id !== item.id);

          // Add new item at the beginning
          const updated = [
            { ...item, timestamp: Date.now() },
            ...filtered,
          ].slice(0, 20); // Keep only last 20 items

          return { recentItems: updated };
        });
      },

      clearRecentSearches: () => set({ recentSearches: [] }),

      clearRecentItems: () => set({ recentItems: [] }),

      getRecentSearches: (limit = 5) => {
        const { recentSearches } = get();
        return recentSearches
          .slice(0, limit)
          .map((s) => s.query);
      },

      getRecentItems: (limit = 5) => {
        const { recentItems } = get();
        return recentItems.slice(0, limit);
      },
    }),
    {
      name: 'command-palette-storage',
      version: 1,
    }
  )
);
