import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook to handle highlighting and scrolling to a specific item
 * when navigating from search results
 */
export const useHighlightItem = <T extends { _id?: string; id?: string }>(
  items: T[],
  loading: boolean
) => {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const itemRefs = useRef<{ [key: string]: HTMLElement | null }>({});

  useEffect(() => {
    const highlightId = searchParams.get('highlight');
    if (!highlightId || loading || items.length === 0) return;

    console.log('[useHighlightItem] Attempting to highlight item:', highlightId);

    // Wait for DOM to render
    setTimeout(() => {
      const element = itemRefs.current[highlightId];
      if (element) {
        // Scroll to element
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Add highlight effect
        element.classList.add('ring-2', 'ring-violet-500', 'ring-offset-2', 'ring-offset-background');

        // Remove highlight after 3 seconds
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-violet-500', 'ring-offset-2', 'ring-offset-background');
        }, 3000);
      } else {
        console.warn('[useHighlightItem] Item not found in current view:', highlightId);
        toast({
          title: "Item Not Visible",
          description: "The item might be on a different page or filtered out.",
          variant: "default",
        });
      }
    }, 300);
  }, [searchParams, loading, items, toast]);

  return itemRefs;
};
