import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { summarizeLatestBookmarksService } from '../services/bookmarkService';
import { useToast } from '@/hooks/use-toast';
import { BookmarkItemType } from '../types/bookmark';
import useAuthStore from '@/store/authStore';

// Define a type for the source info
export interface DigestSourceInfo {
  _id: string;
  title?: string;
  originalUrl: string;
}

interface DigestContextType {
  latestDigest: string | null;
  setLatestDigest: (digest: string | null) => void;
  latestDigestSources: DigestSourceInfo[] | null;
  setLatestDigestSources: (sources: DigestSourceInfo[] | null) => void;
  isBatchSummarizing: boolean;
  summarizeLatestBookmarks: (
    currentBookmarks: BookmarkItemType[],
    setCurrentBookmarks: React.Dispatch<React.SetStateAction<BookmarkItemType[] | null>>
  ) => Promise<void>;
}

const DigestContext = createContext<DigestContextType | undefined>(undefined);

export const DigestProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [latestDigest, _setLatestDigestInternal] = useState<string | null>(null);
  const [latestDigestSources, _setLatestDigestSourcesInternal] = useState<DigestSourceInfo[] | null>(null);
  const [isBatchSummarizing, setIsBatchSummarizing] = useState<boolean>(false);
  const { toast } = useToast();
  const userId = useAuthStore((state) => state.user?.id);
  const hasAuthHydrated = useAuthStore((state) => state.hasHydrated);

  const DIGEST_STORAGE_KEY = 'latestDigest';
  const DIGEST_SOURCES_STORAGE_KEY = 'latestDigestSources';
  const digestKey = userId ? `${DIGEST_STORAGE_KEY}:${userId}` : null;
  const digestSourcesKey = userId ? `${DIGEST_SOURCES_STORAGE_KEY}:${userId}` : null;

  useEffect(() => {
    if (!hasAuthHydrated) {
      return;
    }

    // Cleanup legacy, user-agnostic keys so digests don't leak between accounts
    localStorage.removeItem(DIGEST_STORAGE_KEY);
    localStorage.removeItem(DIGEST_SOURCES_STORAGE_KEY);

    if (!digestKey || !digestSourcesKey) {
      _setLatestDigestInternal(null);
      _setLatestDigestSourcesInternal(null);
      return;
    }

    try {
      const storedDigest = localStorage.getItem(digestKey);
      _setLatestDigestInternal(storedDigest ? JSON.parse(storedDigest) : null);
    } catch (err) {
      console.error('[DigestProvider] Failed to parse stored digest. Clearing value.', err);
      _setLatestDigestInternal(null);
      localStorage.removeItem(digestKey);
    }

    try {
      const storedSources = localStorage.getItem(digestSourcesKey);
      _setLatestDigestSourcesInternal(storedSources ? JSON.parse(storedSources) : null);
    } catch (err) {
      console.error('[DigestProvider] Failed to parse stored digest sources. Clearing value.', err);
      _setLatestDigestSourcesInternal(null);
      localStorage.removeItem(digestSourcesKey);
    }
  }, [digestKey, digestSourcesKey, hasAuthHydrated]);

  const setLatestDigest = (digest: string | null) => {
    console.log('[DigestProvider] setLatestDigest CALLED with:', digest);
    _setLatestDigestInternal(digest);
    if (!digestKey) {
      // No authenticated user yet; ensure no shared digest remains
      localStorage.removeItem(DIGEST_STORAGE_KEY);
      return;
    }
    if (digest) {
      localStorage.setItem(digestKey, JSON.stringify(digest));
    } else {
      localStorage.removeItem(digestKey);
    }
    // Always clear legacy key once we write using per-user storage
    localStorage.removeItem(DIGEST_STORAGE_KEY);
  };

  const setLatestDigestSources = (sources: DigestSourceInfo[] | null) => {
    console.log('[DigestProvider] setLatestDigestSources CALLED with:', sources);
    _setLatestDigestSourcesInternal(sources);
    if (!digestSourcesKey) {
      localStorage.removeItem(DIGEST_SOURCES_STORAGE_KEY);
      return;
    }
    if (sources) {
      localStorage.setItem(digestSourcesKey, JSON.stringify(sources));
    } else {
      localStorage.removeItem(digestSourcesKey);
    }
    localStorage.removeItem(DIGEST_SOURCES_STORAGE_KEY);
  };

  const summarizeLatestBookmarks = async (
    currentBookmarks: BookmarkItemType[],
    setCurrentBookmarks: React.Dispatch<React.SetStateAction<BookmarkItemType[] | null>>
  ) => {
    console.log('[DigestProvider] summarizeLatestBookmarks action called');
    setIsBatchSummarizing(true);
    setLatestDigest(null);
    setLatestDigestSources(null);
    if (digestKey) {
      localStorage.removeItem(digestKey);
    }
    if (digestSourcesKey) {
      localStorage.removeItem(digestSourcesKey);
    }
    localStorage.removeItem(DIGEST_STORAGE_KEY);
    localStorage.removeItem(DIGEST_SOURCES_STORAGE_KEY);
    try {
      const response = await summarizeLatestBookmarksService();
      toast({
        title: "Digest Generation Complete",
        description: response.message,
      });
      
      if (response.comprehensiveSummary) {
        setLatestDigest(response.comprehensiveSummary);
      } else {
        setLatestDigest("No comprehensive summary was returned by the backend for the digest.");
      }

      if (response.summarizedBookmarks && response.summarizedBookmarks.length > 0) {
        setCurrentBookmarks(prevBookmarks => {
          if (!prevBookmarks) return response.summarizedBookmarks;
          return prevBookmarks.map(b => {
            const updated = response.summarizedBookmarks.find(sb => sb._id === b._id);
            return updated ? updated : b;
          });
        });
      }

      if (response.errors && response.errors.length > 0) {
        response.errors.forEach(err => {
          toast({
            title: `Error Processing Bookmark ID: ${err.bookmarkId} for digest`,
            description: err.error,
            variant: "destructive",
          });
          setCurrentBookmarks(prevBookmarks => {
            if (!prevBookmarks) return []; // Should not happen if we have errors, but as a safeguard
            return prevBookmarks.map(b => 
              b._id === err.bookmarkId ? { ...b, status: 'error' as 'error', summary: b.summary || `Error while creating digest: ${err.error}` } : b
            );
          });
        });
      }

      if (response.digestSourceInfo) {
        setLatestDigestSources(response.digestSourceInfo);
      }
    } catch (err: any) {
      console.error("Error in summarizeLatestBookmarks action (DigestContext):", err);
      toast({
        title: "Error Generating Digest",
        description: err?.message || "Failed to start digest generation.",
        variant: "destructive",
      });
      setLatestDigest("Failed to generate digest due to an error.");
      setLatestDigestSources([]);
    } finally {
      setIsBatchSummarizing(false);
    }
  };

  console.log('[DigestProvider] PROVIDER RENDERING, latestDigest:', latestDigest, 'isBatchSummarizing:', isBatchSummarizing, 'sources:', latestDigestSources);

  return (
    <DigestContext.Provider value={{ latestDigest, setLatestDigest, latestDigestSources, setLatestDigestSources, isBatchSummarizing, summarizeLatestBookmarks }}>
      {children}
    </DigestContext.Provider>
  );
};

export const useDigest = (): DigestContextType => {
  const context = useContext(DigestContext);
  if (context === undefined) {
    throw new Error('useDigest must be used within a DigestProvider');
  }
  return context;
};
