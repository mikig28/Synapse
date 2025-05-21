import React, { createContext, useState, useContext, ReactNode } from 'react';
import { summarizeLatestBookmarksService, SummarizeLatestResponse } from '../services/bookmarkService';
import { useToast } from '@/hooks/use-toast';
import { BookmarkItemType } from '../types/bookmark';

interface DigestContextType {
  latestDigest: string | null;
  setLatestDigest: (digest: string | null) => void;
  isBatchSummarizing: boolean;
  summarizeLatestBookmarks: (
    currentBookmarks: BookmarkItemType[], 
    setCurrentBookmarks: React.Dispatch<React.SetStateAction<BookmarkItemType[]>>
  ) => Promise<void>;
}

const DigestContext = createContext<DigestContextType | undefined>(undefined);

export const DigestProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [latestDigest, _setLatestDigestInternal] = useState<string | null>(null);
  const [isBatchSummarizing, setIsBatchSummarizing] = useState<boolean>(false);
  const { toast } = useToast();

  const setLatestDigest = (digest: string | null) => {
    console.log('[DigestProvider] setLatestDigest CALLED with:', digest);
    _setLatestDigestInternal(digest);
  };

  const summarizeLatestBookmarks = async (
    currentBookmarks: BookmarkItemType[],
    setCurrentBookmarks: React.Dispatch<React.SetStateAction<BookmarkItemType[]>>
  ) => {
    console.log('[DigestProvider] summarizeLatestBookmarks action called');
    setIsBatchSummarizing(true);
    setLatestDigest(null);
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
        setCurrentBookmarks(prevBookmarks => 
          prevBookmarks.map(b => {
            const updated = response.summarizedBookmarks.find(sb => sb._id === b._id);
            return updated ? updated : b;
          })
        );
      }

      if (response.errors && response.errors.length > 0) {
        response.errors.forEach(err => {
          toast({
            title: `Error Processing Bookmark ID: ${err.bookmarkId} for digest`,
            description: err.error,
            variant: "destructive",
          });
          setCurrentBookmarks(prevBookmarks => 
            prevBookmarks.map(b => 
              b._id === err.bookmarkId ? { ...b, status: 'error' as 'error', summary: b.summary || `Error while creating digest: ${err.error}` } : b
            )
          );
        });
      }
    } catch (err: any) {
      console.error("Error in summarizeLatestBookmarks action (DigestContext):", err);
      toast({
        title: "Error Generating Digest",
        description: err?.message || "Failed to start digest generation.",
        variant: "destructive",
      });
      setLatestDigest("Failed to generate digest due to an error.");
    } finally {
      setIsBatchSummarizing(false);
    }
  };

  console.log('[DigestProvider] PROVIDER RENDERING, latestDigest:', latestDigest, 'isBatchSummarizing:', isBatchSummarizing);

  return (
    <DigestContext.Provider value={{ latestDigest, setLatestDigest, isBatchSummarizing, summarizeLatestBookmarks }}>
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