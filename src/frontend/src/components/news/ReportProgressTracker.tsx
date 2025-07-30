import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ChevronUp,
  ChevronDown,
  Eye,
  Clock,
  BookOpen,
  Target,
  Award,
  TrendingUp,
  Users,
  Heart,
  Lightbulb,
  FileText,
  Navigation,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Section {
  id: string;
  title: string;
  icon: React.ReactNode;
  estimatedTime: number; // in seconds
  completed: boolean;
  currentlyReading: boolean;
}

interface ReportProgressTrackerProps {
  sections?: Section[];
  currentSection?: string;
  totalProgress?: number;
  readingTime?: number;
  className?: string;
  onSectionClick?: (sectionId: string) => void;
  onToggleMinimize?: () => void;
  minimized?: boolean;
}

const ReportProgressTracker: React.FC<ReportProgressTrackerProps> = ({
  sections = [],
  currentSection = '',
  totalProgress = 0,
  readingTime = 0,
  className,
  onSectionClick,
  onToggleMinimize,
  minimized = false
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(0);
  const [readingSpeed, setReadingSpeed] = useState(200); // words per minute
  const trackerRef = useRef<HTMLDivElement>(null);

  // Default sections if none provided
  const defaultSections: Section[] = [
    {
      id: 'overview',
      title: 'Overview',
      icon: <FileText className="w-4 h-4" />,
      estimatedTime: 60,
      completed: currentSection === 'overview' || sections.some(s => s.id === 'overview' && s.completed),
      currentlyReading: currentSection === 'overview'
    },
    {
      id: 'trends',
      title: 'Trending Topics',
      icon: <TrendingUp className="w-4 h-4" />,
      estimatedTime: 90,
      completed: currentSection === 'trends' || sections.some(s => s.id === 'trends' && s.completed),
      currentlyReading: currentSection === 'trends'
    },
    {
      id: 'sources',
      title: 'Sources',
      icon: <Users className="w-4 h-4" />,
      estimatedTime: 70,
      completed: currentSection === 'sources' || sections.some(s => s.id === 'sources' && s.completed),
      currentlyReading: currentSection === 'sources'
    },
    {
      id: 'sentiment',
      title: 'Sentiment',
      icon: <Heart className="w-4 h-4" />,
      estimatedTime: 50,
      completed: currentSection === 'sentiment' || sections.some(s => s.id === 'sentiment' && s.completed),
      currentlyReading: currentSection === 'sentiment'
    },
    {
      id: 'insights',
      title: 'Insights',
      icon: <Lightbulb className="w-4 h-4" />,
      estimatedTime: 120,
      completed: currentSection === 'insights' || sections.some(s => s.id === 'insights' && s.completed),
      currentlyReading: currentSection === 'insights'
    },
    {
      id: 'recommendations',
      title: 'Actions',
      icon: <Target className="w-4 h-4" />,
      estimatedTime: 80,
      completed: currentSection === 'recommendations' || sections.some(s => s.id === 'recommendations' && s.completed),
      currentlyReading: currentSection === 'recommendations'
    }
  ];

  const activeSections = sections.length > 0 ? sections : defaultSections;
  const completedSections = activeSections.filter(s => s.completed).length;
  const progressPercent = totalProgress || (completedSections / activeSections.length) * 100;

  // Calculate scroll progress
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const currentScroll = window.scrollY;
      const scrollPercentage = (currentScroll / totalHeight) * 100;
      setScrollProgress(Math.min(scrollPercentage, 100));

      // Show tracker after scrolling down a bit
      setIsVisible(currentScroll > 200);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Calculate estimated time remaining
  useEffect(() => {
    const remainingSections = activeSections.filter(s => !s.completed);
    const totalRemainingTime = remainingSections.reduce((sum, s) => sum + s.estimatedTime, 0);
    setEstimatedTimeRemaining(totalRemainingTime);
  }, [activeSections]);

  // Format time display
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  };

  // Handle section navigation
  const handleSectionClick = (sectionId: string) => {
    onSectionClick?.(sectionId);
    
    // Smooth scroll to section if element exists
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Minimized view
  const MinimizedView = () => (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      className="flex items-center gap-2"
    >
      <div className="flex items-center gap-1">
        <BookOpen className="w-4 h-4 text-blue-500" />
        <span className="text-sm font-medium">{completedSections}/{activeSections.length}</span>
      </div>
      <Progress value={progressPercent} className="w-16 h-2" />
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleMinimize}
        className="h-8 w-8 p-0"
      >
        <Maximize2 className="w-3 h-3" />
      </Button>
    </motion.div>
  );

  // Full view
  const FullView = () => (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 20, opacity: 0 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Navigation className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold text-sm">Reading Progress</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleMinimize}
          className="h-7 w-7 p-0"
        >
          <Minimize2 className="w-3 h-3" />
        </Button>
      </div>

      {/* Progress overview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Overall Progress</span>
          <span>{Math.round(progressPercent)}%</span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Reading stats */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="flex items-center gap-1 text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{formatTime(readingTime)} read</span>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Target className="w-3 h-3" />
          <span>~{formatTime(estimatedTimeRemaining)} left</span>
        </div>
      </div>

      {/* Section navigation */}
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {activeSections.map((section, index) => {
          const isActive = section.currentlyReading || section.id === currentSection;
          const isCompleted = section.completed;
          
          return (
            <motion.button
              key={section.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleSectionClick(section.id)}
              className={cn(
                "w-full flex items-center gap-2 p-2 rounded-lg text-left transition-all hover:bg-muted/50",
                isActive && "bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800",
                isCompleted && "opacity-75"
              )}
            >
              <div className={cn(
                "p-1 rounded-full",
                isCompleted ? "bg-green-500 text-white" : 
                isActive ? "bg-blue-500 text-white" : "bg-muted text-muted-foreground"
              )}>
                {isCompleted ? (
                  <Award className="w-3 h-3" />
                ) : (
                  section.icon
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={cn(
                    "text-xs font-medium truncate",
                    isActive && "text-blue-700 dark:text-blue-300"
                  )}>
                    {section.title}
                  </span>
                  {isCompleted && (
                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 ml-1">
                      ✓
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  ~{formatTime(section.estimatedTime)}
                </div>
              </div>

              {isActive && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-2 h-2 bg-blue-500 rounded-full"
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Achievement indicator */}
      {progressPercent === 100 && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800"
        >
          <Award className="w-4 h-4 text-green-600" />
          <span className="text-xs font-medium text-green-700 dark:text-green-300">
            Report Complete!
          </span>
        </motion.div>
      )}

      {/* Scroll progress indicator */}
      <div className="pt-2 border-t">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span>Scroll Progress</span>
          <span>{Math.round(scrollProgress)}%</span>
        </div>
        <Progress value={scrollProgress} className="h-1" />
      </div>
    </motion.div>
  );

  if (!isVisible) return null;

  return (
    <motion.div
      ref={trackerRef}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={cn(
        "fixed right-4 top-1/2 transform -translate-y-1/2 z-40 max-w-xs",
        className
      )}
    >
      <Card className="bg-background/95 backdrop-blur-sm border shadow-lg">
        <CardContent className={cn(
          "p-3 transition-all duration-300",
          minimized ? "w-auto" : "w-72"
        )}>
          <AnimatePresence mode="wait">
            {minimized ? (
              <MinimizedView key="minimized" />
            ) : (
              <FullView key="full" />
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Quick navigation arrows */}
      {!minimized && (
        <div className="flex flex-col gap-1 mt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.scrollBy({ top: -500, behavior: 'smooth' })}
            className="h-8 w-8 p-0 bg-background/95 backdrop-blur-sm"
          >
            <ChevronUp className="w-3 h-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.scrollBy({ top: 500, behavior: 'smooth' })}
            className="h-8 w-8 p-0 bg-background/95 backdrop-blur-sm"
          >
            <ChevronDown className="w-3 h-3" />
          </Button>
        </div>
      )}
    </motion.div>
  );
};

export default ReportProgressTracker;