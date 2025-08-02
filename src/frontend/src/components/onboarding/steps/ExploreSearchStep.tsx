import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useOnboardingStore } from '@/store/onboardingStore';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Sparkles, 
  FileText, 
  MessageSquare, 
  Calendar,
  CheckCircle,
  ArrowRight,
  Zap,
  Target,
  Filter
} from 'lucide-react';

export const ExploreSearchStep: React.FC = () => {
  const { completeStep, showAchievement } = useOnboardingStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const sampleQueries = [
    'project updates',
    'meeting notes',
    'important tasks',
    'recent documents'
  ];

  const searchFeatures = [
    {
      icon: <Zap className="w-5 h-5 text-yellow-400" />,
      title: 'Instant Results',
      description: 'Find information across all your sources in seconds'
    },
    {
      icon: <Filter className="w-5 h-5 text-blue-400" />,
      title: 'Smart Filters',
      description: 'Filter by content type, date, or source automatically'
    },
    {
      icon: <Target className="w-5 h-5 text-green-400" />,
      title: 'Contextual Understanding',
      description: 'AI understands intent and finds relevant context'
    }
  ];

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setIsSearching(true);

    // Simulate search
    setTimeout(() => {
      setIsSearching(false);
      setHasSearched(true);
      showAchievement('🔍 You\'ve discovered the power of search!');
      setTimeout(() => completeStep('explore-search'), 1000);
    }, 1500);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div 
        className="text-center space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">
          Discover Powerful Search
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Search across all your connected content with AI-powered understanding. 
          Try it out with a sample query!
        </p>
      </motion.div>

      {/* Search Demo */}
      <motion.div
        className="max-w-2xl mx-auto"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <GlassCard className="p-8">
          <div className="space-y-6">
            {/* Search Input */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">
                Try searching for something:
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search across all your content..."
                  className="pl-10 pr-4 py-3 text-lg"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && searchQuery.trim()) {
                      handleSearch(searchQuery);
                    }
                  }}
                />
              </div>
            </div>

            {/* Sample Queries */}
            <div className="space-y-3">
              <span className="text-sm text-muted-foreground">
                Or try one of these sample searches:
              </span>
              <div className="flex flex-wrap gap-2">
                {sampleQueries.map((query, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSearch(query)}
                    disabled={isSearching}
                    className="text-xs"
                  >
                    {query}
                  </Button>
                ))}
              </div>
            </div>

            {/* Search Button */}
            <Button
              onClick={() => searchQuery.trim() && handleSearch(searchQuery)}
              disabled={!searchQuery.trim() || isSearching}
              className="w-full bg-primary hover:bg-primary/90"
              size="lg"
            >
              {isSearching ? (
                <>
                  <Search className="w-4 h-4 mr-2 animate-pulse" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Search Now
                </>
              )}
            </Button>

            {/* Success State */}
            {hasSearched && (
              <motion.div
                className="text-center space-y-3"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-green-300 font-medium">Search completed!</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Great! You've just experienced Synapse's powerful search capabilities.
                </p>
              </motion.div>
            )}
          </div>
        </GlassCard>
      </motion.div>

      {/* Features Grid */}
      <motion.div
        className="grid md:grid-cols-3 gap-6"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        {searchFeatures.map((feature, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 * index }}
          >
            <GlassCard className="p-6 h-full text-center">
              <div className="mb-4 flex justify-center">
                <div className="p-3 bg-muted/30 rounded-lg">
                  {feature.icon}
                </div>
              </div>
              <h3 className="font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {feature.description}
              </p>
            </GlassCard>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};