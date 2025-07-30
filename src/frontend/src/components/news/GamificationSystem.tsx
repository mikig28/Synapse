import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Award,
  Trophy,
  Star,
  Target,
  Zap,
  BookOpen,
  Clock,
  TrendingUp,
  Users,
  Heart,
  Lightbulb,
  Eye,
  CheckCircle,
  Flame,
  Calendar,
  BarChart3,
  Medal,
  Crown,
  Gift,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Achievement definitions
interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: 'reading' | 'engagement' | 'discovery' | 'social' | 'milestone';
  points: number;
  requirement: number;
  progress: number;
  unlocked: boolean;
  unlockedAt?: Date;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface UserStats {
  reportsRead: number;
  totalReadingTime: number; // in seconds
  sectionsCompleted: number;
  topicsExplored: number;
  interactionsMade: number;
  streakDays: number;
  totalPoints: number;
  level: number;
  joinedAt: Date;
}

interface GamificationSystemProps {
  userStats?: Partial<UserStats>;
  onStatsUpdate?: (stats: UserStats) => void;
  showAchievements?: boolean;
  showLeaderboard?: boolean;
  className?: string;
}

const GamificationSystem: React.FC<GamificationSystemProps> = ({
  userStats = {},
  onStatsUpdate,
  showAchievements = true,
  showLeaderboard = false,
  className
}) => {
  const [currentStats, setCurrentStats] = useState<UserStats>({
    reportsRead: 0,
    totalReadingTime: 0,
    sectionsCompleted: 0,
    topicsExplored: 0,
    interactionsMade: 0,
    streakDays: 0,
    totalPoints: 0,
    level: 1,
    joinedAt: new Date(),
    ...userStats
  });

  const [recentAchievements, setRecentAchievements] = useState<Achievement[]>([]);
  const [showAchievementPopup, setShowAchievementPopup] = useState<Achievement | null>(null);

  // Achievement definitions
  const achievementDefinitions: Omit<Achievement, 'progress' | 'unlocked' | 'unlockedAt'>[] = [
    // Reading achievements
    {
      id: 'first_report',
      title: 'First Steps',
      description: 'Read your first AI analysis report',
      icon: <BookOpen className="w-5 h-5" />,
      category: 'reading',
      points: 10,
      requirement: 1,
      rarity: 'common'
    },
    {
      id: 'speed_reader',
      title: 'Speed Reader',
      description: 'Read 5 reports in one day',
      icon: <Zap className="w-5 h-5" />,
      category: 'reading',
      points: 50,
      requirement: 5,
      rarity: 'rare'
    },
    {
      id: 'knowledge_seeker',
      title: 'Knowledge Seeker',
      description: 'Read 25 reports',
      icon: <Trophy className="w-5 h-5" />,
      category: 'reading',
      points: 100,
      requirement: 25,
      rarity: 'epic'
    },
    {
      id: 'master_analyst',
      title: 'Master Analyst',
      description: 'Read 100 reports',
      icon: <Crown className="w-5 h-5" />,
      category: 'reading',
      points: 500,
      requirement: 100,
      rarity: 'legendary'
    },

    // Time-based achievements
    {
      id: 'dedicated_reader',
      title: 'Dedicated Reader',
      description: 'Spend 1 hour reading reports',
      icon: <Clock className="w-5 h-5" />,
      category: 'reading',
      points: 25,
      requirement: 3600, // 1 hour in seconds
      rarity: 'common'
    },
    {
      id: 'time_master',
      title: 'Time Master',
      description: 'Spend 10 hours reading reports',
      icon: <Target className="w-5 h-5" />,
      category: 'reading',
      points: 150,
      requirement: 36000, // 10 hours
      rarity: 'epic'
    },

    // Engagement achievements
    {
      id: 'explorer',
      title: 'Explorer',
      description: 'Explore 10 different trending topics',
      icon: <TrendingUp className="w-5 h-5" />,
      category: 'discovery',
      points: 30,
      requirement: 10,
      rarity: 'common'
    },
    {
      id: 'trend_hunter',
      title: 'Trend Hunter',
      description: 'Explore 50 different trending topics',
      icon: <Eye className="w-5 h-5" />,
      category: 'discovery',
      points: 100,
      requirement: 50,
      rarity: 'rare'
    },
    {
      id: 'interactive_user',
      title: 'Interactive User',
      description: 'Make 100 interactions with reports',
      icon: <Users className="w-5 h-5" />,
      category: 'engagement',
      points: 75,
      requirement: 100,
      rarity: 'rare'
    },

    // Streak achievements
    {
      id: 'consistent',
      title: 'Consistent',
      description: 'Read reports for 3 days in a row',
      icon: <Flame className="w-5 h-5" />,
      category: 'milestone',
      points: 40,
      requirement: 3,
      rarity: 'common'
    },
    {
      id: 'dedicated',
      title: 'Dedicated',
      description: 'Read reports for 7 days in a row',
      icon: <Calendar className="w-5 h-5" />,
      category: 'milestone',
      points: 100,
      requirement: 7,
      rarity: 'rare'
    },
    {
      id: 'unstoppable',
      title: 'Unstoppable',
      description: 'Read reports for 30 days in a row',
      icon: <Medal className="w-5 h-5" />,
      category: 'milestone',
      points: 300,
      requirement: 30,
      rarity: 'legendary'
    },

    // Section completion achievements
    {
      id: 'completionist',
      title: 'Completionist',
      description: 'Complete all sections in 10 reports',
      icon: <CheckCircle className="w-5 h-5" />,
      category: 'reading',
      points: 80,
      requirement: 60, // 6 sections × 10 reports
      rarity: 'rare'
    }
  ];

  // Calculate achievements with current progress
  const achievements = achievementDefinitions.map(def => {
    let progress = 0;
    
    switch (def.id) {
      case 'first_report':
      case 'speed_reader':
      case 'knowledge_seeker':
      case 'master_analyst':
        progress = currentStats.reportsRead;
        break;
      case 'dedicated_reader':
      case 'time_master':
        progress = currentStats.totalReadingTime;
        break;
      case 'explorer':
      case 'trend_hunter':
        progress = currentStats.topicsExplored;
        break;
      case 'interactive_user':
        progress = currentStats.interactionsMade;
        break;
      case 'consistent':
      case 'dedicated':
      case 'unstoppable':
        progress = currentStats.streakDays;
        break;
      case 'completionist':
        progress = currentStats.sectionsCompleted;
        break;
      default:
        progress = 0;
    }

    const unlocked = progress >= def.requirement;
    return {
      ...def,
      progress,
      unlocked,
      unlockedAt: unlocked ? new Date() : undefined
    } as Achievement;
  });

  // Calculate level based on total points
  const calculateLevel = (points: number) => {
    return Math.floor(points / 100) + 1;
  };

  // Calculate points needed for next level
  const pointsToNextLevel = (level: number) => {
    return (level * 100) - currentStats.totalPoints;
  };

  // Get rarity styling
  const getRarityStyle = (rarity: Achievement['rarity']) => {
    switch (rarity) {
      case 'common':
        return 'border-gray-300 bg-gray-50 text-gray-700';
      case 'rare':
        return 'border-blue-300 bg-blue-50 text-blue-700';
      case 'epic':
        return 'border-purple-300 bg-purple-50 text-purple-700';
      case 'legendary':
        return 'border-yellow-300 bg-yellow-50 text-yellow-700';
      default:
        return 'border-gray-300 bg-gray-50 text-gray-700';
    }
  };

  // Check for new achievements
  const checkAchievements = useCallback(() => {
    const newlyUnlocked = achievements.filter(achievement => 
      achievement.unlocked && 
      !recentAchievements.some(recent => recent.id === achievement.id)
    );

    if (newlyUnlocked.length > 0) {
      setRecentAchievements(prev => [...prev, ...newlyUnlocked]);
      
      // Show popup for the first new achievement
      if (newlyUnlocked[0]) {
        setShowAchievementPopup(newlyUnlocked[0]);
        setTimeout(() => setShowAchievementPopup(null), 5000);
      }

      // Update total points
      const newPoints = newlyUnlocked.reduce((sum, a) => sum + a.points, 0);
      const updatedStats = {
        ...currentStats,
        totalPoints: currentStats.totalPoints + newPoints,
        level: calculateLevel(currentStats.totalPoints + newPoints)
      };
      
      setCurrentStats(updatedStats);
      onStatsUpdate?.(updatedStats);
    }
  }, [achievements, recentAchievements, currentStats, onStatsUpdate]);

  // Update stats
  const updateStats = (newStats: Partial<UserStats>) => {
    const updatedStats = { ...currentStats, ...newStats };
    setCurrentStats(updatedStats);
    checkAchievements();
  };

  // Stats overview component
  const StatsOverview = () => (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="w-5 h-5 text-blue-500" />
          Your Progress
          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
            Level {currentStats.level}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Level progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Level Progress</span>
            <span>{currentStats.totalPoints} points</span>
          </div>
          <Progress 
            value={(currentStats.totalPoints % 100)} 
            className="h-2" 
          />
          <p className="text-xs text-muted-foreground">
            {pointsToNextLevel(currentStats.level + 1)} points to Level {currentStats.level + 1}
          </p>
        </div>

        {/* Key stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-xl font-bold text-green-600">{currentStats.reportsRead}</div>
            <div className="text-xs text-muted-foreground">Reports Read</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-xl font-bold text-orange-600">{currentStats.streakDays}</div>
            <div className="text-xs text-muted-foreground">Day Streak</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-xl font-bold text-purple-600">{Math.floor(currentStats.totalReadingTime / 60)}</div>
            <div className="text-xs text-muted-foreground">Minutes Read</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-xl font-bold text-blue-600">{currentStats.topicsExplored}</div>
            <div className="text-xs text-muted-foreground">Topics Explored</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Achievements grid
  const AchievementsGrid = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          Achievements
          <Badge variant="secondary">
            {achievements.filter(a => a.unlocked).length}/{achievements.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {achievements.map((achievement, index) => (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "p-3 rounded-lg border-2 transition-all hover:scale-105",
                achievement.unlocked 
                  ? getRarityStyle(achievement.rarity)
                  : "border-gray-200 bg-gray-50/50 opacity-60"
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "p-2 rounded-full",
                  achievement.unlocked ? "bg-white/80" : "bg-gray-200"
                )}>
                  {achievement.unlocked ? achievement.icon : <Eye className="w-5 h-5 text-gray-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm mb-1">{achievement.title}</h3>
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                    {achievement.description}
                  </p>
                  
                  {!achievement.unlocked && (
                    <div className="space-y-1">
                      <Progress 
                        value={(achievement.progress / achievement.requirement) * 100} 
                        className="h-1" 
                      />
                      <p className="text-xs text-muted-foreground">
                        {achievement.progress}/{achievement.requirement}
                      </p>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mt-2">
                    <Badge variant="outline" className="text-xs">
                      {achievement.rarity}
                    </Badge>
                    <span className="text-xs font-medium">+{achievement.points}pts</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className={cn("space-y-6", className)}>
      <StatsOverview />
      
      {showAchievements && <AchievementsGrid />}

      {/* Achievement popup */}
      <AnimatePresence>
        {showAchievementPopup && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            className="fixed bottom-4 left-4 z-50 max-w-sm"
          >
            <Card className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-yellow-600">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-full">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Achievement Unlocked!</p>
                    <p className="text-sm opacity-90">{showAchievementPopup.title}</p>
                    <p className="text-xs opacity-75">+{showAchievementPopup.points} points</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GamificationSystem;