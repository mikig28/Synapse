import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { summarizeLatestBookmarksService, SummarizeLatestResponse } from '../services/bookmarkService';
import { useToast } from '@/hooks/use-toast';
import { BookmarkItemType } from '../types/bookmark';

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
  const [latestDigest, _setLatestDigestInternal] = useState<string | null>(() => {
    const storedDigest = localStorage.getItem('latestDigest');
    return storedDigest ? JSON.parse(storedDigest) : null;
  });
  const [latestDigestSources, _setLatestDigestSourcesInternal] = useState<DigestSourceInfo[] | null>(() => {
    const storedSources = localStorage.getItem('latestDigestSources');
    return storedSources ? JSON.parse(storedSources) : null;
  });
  const [isBatchSummarizing, setIsBatchSummarizing] = useState<boolean>(false);
  const { toast } = useToast();

  useEffect(() => {
    const storedDigest = localStorage.getItem('latestDigest');
    if (storedDigest) {
      _setLatestDigestInternal(JSON.parse(storedDigest));
    }
    const storedSources = localStorage.getItem('latestDigestSources');
    if (storedSources) {
      _setLatestDigestSourcesInternal(JSON.parse(storedSources));
    }
  }, []);

  const setLatestDigest = (digest: string | null) => {
    console.log('[DigestProvider] setLatestDigest CALLED with:', digest);
    _setLatestDigestInternal(digest);
    if (digest) {
      localStorage.setItem('latestDigest', JSON.stringify(digest));
    } else {
      localStorage.removeItem('latestDigest');
    }
  };

  const setLatestDigestSources = (sources: DigestSourceInfo[] | null) => {
    console.log('[DigestProvider] setLatestDigestSources CALLED with:', sources);
    _setLatestDigestSourcesInternal(sources);
    if (sources) {
      localStorage.setItem('latestDigestSources', JSON.stringify(sources));
    } else {
      localStorage.removeItem('latestDigestSources');
    }
  };

  const summarizeLatestBookmarks = async (
    currentBookmarks: BookmarkItemType[],
    setCurrentBookmarks: React.Dispatch<React.SetStateAction<BookmarkItemType[] | null>>
  ) => {
    console.log('[DigestProvider] summarizeLatestBookmarks action called');
    setIsBatchSummarizing(true);
    setLatestDigest(null);
    setLatestDigestSources(null);
    localStorage.removeItem('latestDigest');
    localStorage.removeItem('latestDigestSources');
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