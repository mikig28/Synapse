import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, ExternalLink, Sparkles, FileText, MessageSquare, ArrowRight } from 'lucide-react';
import { useOnboardingStore } from '@/store/onboardingStore';
import searchService from '@/services/searchService';
import { GlassCard } from '@/components/ui/GlassCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface SearchResultItem {
  id: string;
  title: string;
  excerpt: string;
  type: string;
}

const typeIcon = (type: string) => {
  switch (type) {
    case 'document':
      return <FileText className="h-4 w-4" />;
    case 'whatsapp':
      return <MessageSquare className="h-4 w-4" />;
    default:
      return <Sparkles className="h-4 w-4" />;
  }
};

export const ExploreSearchStep: React.FC = () => {
  const { toast } = useToast();
  const { completeStep, skipStep } = useOnboardingStore();

  const [query, setQuery] = useState('latest customer feedback');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [totalResults, setTotalResults] = useState<number | null>(null);
  const [hasCompleted, setHasCompleted] = useState(false);

  const runSearch = async () => {
    if (!query.trim()) {
      toast({ variant: 'destructive', title: 'Enter something to search' });
      return;
    }
    setIsSearching(true);
    try {
      const response = await searchService.universalSearch({ query: query.trim(), limit: 5 });
      const mapped = response.results.map((item) => ({
        id: item.id,
        title: item.title || 'Untitled result',
        excerpt: item.excerpt || item.content?.slice(0, 120) || '',
        type: item.type,
      }));
      setResults(mapped);
      setTotalResults(response.totalResults);
      if (!hasCompleted) {
        completeStep('explore-search');
        setHasCompleted(true);
        toast({ title: 'Search complete', description: 'Keep exploring filtered searches from the search page.' });
      }
    } catch (error: any) {
      console.error('Search failed', error);
      const message = error?.response?.data?.error || error?.message || 'We could not run that search.';
      toast({ variant: 'destructive', title: 'Search failed', description: message });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-8">
      <GlassCard className="p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Find anything instantly</h2>
            <p className="text-sm text-muted-foreground">
              Search runs across documents, chats, notes, and agents. Try a question or a phrase you would ask a teammate.
            </p>
          </div>
          <Button variant="ghost" onClick={skipStep} className="text-muted-foreground hover:text-foreground">
            Skip for now
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        <div className="mt-6 flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="What did the customer ask about pricing?"
              className="pl-9"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  runSearch();
                }
              }}
            />
          </div>
          <Button onClick={runSearch} disabled={isSearching}>
            {isSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            Search
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span>Suggestions:</span>
          {['tasks I promised', 'messages tagged follow up', 'notes about onboarding'].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => setQuery(suggestion)}
              className="rounded-full border border-border px-3 py-1 transition hover:border-primary hover:text-primary"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </GlassCard>

      <AnimatePresence initial={false}>
        {isSearching && (
          <motion.div
            className="flex items-center gap-3 text-sm text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            Searching across your knowledge graph…
          </motion.div>
        )}
      </AnimatePresence>

      {totalResults !== null && (
        <p className="text-sm text-muted-foreground">
          Found {totalResults} result{totalResults === 1 ? '' : 's'} for “{query}”. Showing top {results.length}.
        </p>
      )}

      <div className="grid gap-4">
        {results.map((result) => (
          <GlassCard key={result.id} className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1 text-foreground">
                    {typeIcon(result.type)}
                    {result.type}
                  </span>
                  <Badge variant="secondary">Relevance</Badge>
                </div>
                <h3 className="mt-2 text-base font-semibold text-foreground">{result.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-3">{result.excerpt}</p>
              </div>
              <Button
                variant="ghost"
                className="hidden md:inline-flex"
                onClick={() => window.open(`/search?query=${encodeURIComponent(query)}`, '_blank')}
              >
                Open
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </GlassCard>
        ))}

        {results.length === 0 && totalResults === 0 && (
          <GlassCard className="p-8 text-center text-sm text-muted-foreground">
            No matches yet. Add a document or connect a data source, then try again.
          </GlassCard>
        )}
      </div>
    </div>
  );
};
