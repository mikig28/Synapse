import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useSwipeable, PanInfo } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { 
  Bot,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Share2,
  Bookmark,
  Eye,
  Clock,
  TrendingUp,
  Users,
  Heart,
  ArrowUp,
  Menu,
  X,
  Maximize2,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Import our visualization components with mobile optimizations
import TrendingTopicsChart from './TrendingTopicsChart';
import SourceDistributionChart from './SourceDistributionChart';
import SentimentIndicator from './SentimentIndicator';

interface MobileSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
  estimatedTime: number; // in seconds
  completed: boolean;
}

interface MobileReportViewerProps {
  reportData: {
    id: string;
    title: string;
    summary: string[];
    trendingTopics: any[];
    sourceBreakdown: any[];
    sentiment?: any;
    aiInsights: any;
    recommendations: string[];
    metadata: any;
  };
  className?: string;
  onClose?: () => void;
  onSectionComplete?: (sectionId: string) => void;
  onReportComplete?: () => void;
}

const MobileReportViewer: React.FC<MobileReportViewerProps> = ({
  reportData,
  className,
  onClose,
  onSectionComplete,
  onReportComplete
}) => {
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());
  const [isAutoRead, setIsAutoRead] = useState(false);
  const [readingSpeed, setReadingSpeed] = useState(1); // 1x speed
  const [showTableOfContents, setShowTableOfContents] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  
  const autoReadTimer = useRef<NodeJS.Timeout>();
  const sectionStartTime = useRef<number>(Date.now());

  // Create mobile-optimized sections
  const sections: MobileSection[] = [
    {
      id: 'overview',
      title: 'Executive Summary',
      icon: <Eye className="w-4 h-4" />,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-lg font-bold text-blue-600">{reportData.trendingTopics.length}</div>
              <div className="text-xs text-muted-foreground">Topics</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-lg font-bold text-green-600">{reportData.sourceBreakdown.length}</div>
              <div className="text-xs text-muted-foreground">Sources</div>
            </div>
          </div>
          <div className="space-y-3">
            {reportData.summary.slice(0, 3).map((point, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                <p className="text-sm leading-relaxed">{point}</p>
              </div>
            ))}
          </div>
        </div>
      ),
      estimatedTime: 45,
      completed: false
    },
    {
      id: 'trends',
      title: 'Trending Topics',
      icon: <TrendingUp className="w-4 h-4" />,
      content: (
        <TrendingTopicsChart
          topics={reportData.trendingTopics}
          maxTopics={5}
          animated={true}
          interactive={true}
        />
      ),
      estimatedTime: 60,
      completed: false
    },
    {
      id: 'sources',
      title: 'Content Sources',
      icon: <Users className="w-4 h-4" />,
      content: (
        <SourceDistributionChart
          sources={reportData.sourceBreakdown}
          animated={true}
          interactive={true}
          viewMode="grid"
        />
      ),
      estimatedTime: 40,
      completed: false
    },
    {
      id: 'sentiment',
      title: 'Sentiment Analysis',
      icon: <Heart className="w-4 h-4" />,
      content: reportData.sentiment ? (
        <SentimentIndicator
          data={reportData.sentiment}
          animated={true}
          interactive={true}
          size="lg"
          viewMode="gauge"
        />
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Heart className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No sentiment data available</p>
        </div>
      ),
      estimatedTime: 30,
      completed: false
    },
    {
      id: 'insights',
      title: 'Key Insights',
      icon: <Bot className="w-4 h-4" />,
      content: (
        <div className="space-y-4">
          <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
            <h3 className="font-semibold text-purple-900 mb-2">Market Implications</h3>
            <p className="text-sm text-purple-800 leading-relaxed">
              {reportData.aiInsights.marketImplications || 'Market analysis indicates positive trends across multiple sectors.'}
            </p>
          </div>
          <div className="p-4 bg-gradient-to-r from-green-50 to-teal-50 rounded-lg border border-green-200">
            <h3 className="font-semibold text-green-900 mb-2">Technology Focus</h3>
            <p className="text-sm text-green-800 leading-relaxed">
              {reportData.aiInsights.technologyFocus || 'Emerging technologies show significant innovation potential.'}
            </p>
          </div>
          {reportData.aiInsights.keyThemes && (
            <div>
              <h3 className="font-semibold mb-2">Key Themes</h3>
              <div className="flex flex-wrap gap-2">
                {reportData.aiInsights.keyThemes.map((theme: string, idx: number) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {theme}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      ),
      estimatedTime: 75,
      completed: false
    },
    {
      id: 'recommendations',
      title: 'Recommendations',
      icon: <ArrowUp className="w-4 h-4" />,
      content: (
        <div className="space-y-3">
          {reportData.recommendations.map((rec, idx) => (
            <div key={idx} className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {idx + 1}
                </div>
                <p className="text-sm leading-relaxed text-orange-800">{rec}</p>
              </div>
            </div>
          ))}
        </div>
      ),
      estimatedTime: 50,
      completed: false
    }
  ];

  const currentSection = sections[currentSectionIndex];
  const progressPercentage = ((currentSectionIndex + 1) / sections.length) * 100;

  // Swipe handlers
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (currentSectionIndex < sections.length - 1) {
        setSwipeDirection('left');
        nextSection();
      }
    },
    onSwipedRight: () => {
      if (currentSectionIndex > 0) {
        setSwipeDirection('right');
        previousSection();
      }
    },
    preventScrollOnSwipe: true,
    trackMouse: true
  });

  // Navigation functions
  const nextSection = () => {
    if (currentSectionIndex < sections.length - 1) {
      markCurrentSectionComplete();
      setCurrentSectionIndex(prev => prev + 1);
      sectionStartTime.current = Date.now();
    } else {
      onReportComplete?.();
    }
  };

  const previousSection = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex(prev => prev - 1);
      sectionStartTime.current = Date.now();
    }
  };

  const goToSection = (index: number) => {
    setCurrentSectionIndex(index);
    setShowTableOfContents(false);
    sectionStartTime.current = Date.now();
  };

  const markCurrentSectionComplete = () => {
    const timeSpent = Date.now() - sectionStartTime.current;
    if (timeSpent >= currentSection.estimatedTime * 1000 * 0.5) { // At least 50% of estimated time
      setCompletedSections(prev => new Set([...prev, currentSection.id]));
      onSectionComplete?.(currentSection.id);
    }
  };

  // Auto-read functionality
  useEffect(() => {
    if (isAutoRead) {
      const duration = currentSection.estimatedTime * 1000 / readingSpeed;
      autoReadTimer.current = setTimeout(() => {
        nextSection();
      }, duration);
    } else {
      if (autoReadTimer.current) {
        clearTimeout(autoReadTimer.current);
      }
    }

    return () => {
      if (autoReadTimer.current) {
        clearTimeout(autoReadTimer.current);
      }
    };
  }, [currentSectionIndex, isAutoRead, readingSpeed]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') previousSection();
      if (e.key === 'ArrowRight') nextSection();
      if (e.key === 'Escape') onClose?.();
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentSectionIndex]);

  return (
    <div className={cn("h-screen bg-background flex flex-col", className)} {...swipeHandlers}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-purple-600" />
            <span className="font-semibold text-sm truncate max-w-[120px]">
              AI Report
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Table of contents */}
          <Sheet open={showTableOfContents} onOpenChange={setShowTableOfContents}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm">
                <Menu className="w-4 h-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <SheetHeader>
                <SheetTitle>Table of Contents</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-2">
                {sections.map((section, idx) => (
                  <Button
                    key={section.id}
                    variant={idx === currentSectionIndex ? "default" : "ghost"}
                    className="w-full justify-start h-auto p-3"
                    onClick={() => goToSection(idx)}
                  >
                    <div className="flex items-center gap-3">
                      {section.icon}
                      <div className="text-left">
                        <div className="font-medium text-sm">{section.title}</div>
                        <div className="text-xs text-muted-foreground">
                          ~{section.estimatedTime}s read
                        </div>
                      </div>
                      {completedSections.has(section.id) && (
                        <div className="w-2 h-2 rounded-full bg-green-500 ml-auto" />
                      )}
                    </div>
                  </Button>
                ))}
              </div>
            </SheetContent>
          </Sheet>

          {/* Auto-read controls */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAutoRead(!isAutoRead)}
          >
            {isAutoRead ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 py-2 bg-muted/30">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span>{currentSectionIndex + 1} of {sections.length}</span>
          <span>{Math.round(progressPercentage)}% complete</span>
        </div>
        <Progress value={progressPercentage} className="h-1" />
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait" custom={swipeDirection}>
          <motion.div
            key={currentSectionIndex}
            custom={swipeDirection}
            initial={{ 
              x: swipeDirection === 'left' ? 300 : swipeDirection === 'right' ? -300 : 0,
              opacity: 0 
            }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ 
              x: swipeDirection === 'left' ? -300 : swipeDirection === 'right' ? 300 : 0,
              opacity: 0 
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="h-full overflow-auto"
            onAnimationComplete={() => setSwipeDirection(null)}
          >
            <div className="p-4 h-full">
              <Card className="h-full border-l-4 border-l-purple-500">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    {currentSection.icon}
                    {currentSection.title}
                    {completedSections.has(currentSection.id) && (
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                        Complete
                      </Badge>
                    )}
                  </CardTitle>
                  
                  {isAutoRead && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>Auto-reading at {readingSpeed}x speed</span>
                      <div className="flex items-center gap-1 ml-auto">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setReadingSpeed(Math.max(0.5, readingSpeed - 0.25))}
                          className="h-6 w-6 p-0"
                        >
                          -
                        </Button>
                        <span className="text-xs">{readingSpeed}x</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setReadingSpeed(Math.min(2, readingSpeed + 0.25))}
                          className="h-6 w-6 p-0"
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="pb-6">
                  {currentSection.content}
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation footer */}
      <div className="flex items-center justify-between p-4 border-t bg-background/95 backdrop-blur-sm">
        <Button
          variant="outline"
          size="sm"
          onClick={previousSection}
          disabled={currentSectionIndex === 0}
          className="flex items-center gap-1"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </Button>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => {}}>
            <Bookmark className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => {}}>
            <Share2 className="w-4 h-4" />
          </Button>
        </div>

        <Button
          variant="default"
          size="sm"
          onClick={nextSection}
          className="flex items-center gap-1"
        >
          {currentSectionIndex === sections.length - 1 ? 'Complete' : 'Next'}
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Swipe hint for first-time users */}
      {currentSectionIndex === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="absolute bottom-20 left-1/2 transform -translate-x-1/2 pointer-events-none"
        >
          <div className="bg-black/80 text-white px-3 py-2 rounded-lg text-xs">
            Swipe left/right to navigate
          </div>
        </motion.div>
      )}

      {/* Reading completion celebration */}
      <AnimatePresence>
        {completedSections.size === sections.length && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <Card className="m-4 text-center">
              <CardContent className="p-6">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold mb-2">Report Complete!</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  You've successfully read through all sections of this AI analysis.
                </p>
                <Button onClick={onClose}>Close Report</Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MobileReportViewer;