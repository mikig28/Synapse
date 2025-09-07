import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  MessageSquare, 
  Clock, 
  TrendingUp,
  Calendar,
  BarChart3,
  Loader2,
  Sparkles,
  Activity
} from 'lucide-react';
import { GroupCardProps } from '@/types/whatsappSummary';

const GroupCard: React.FC<GroupCardProps> = ({
  group,
  onToggle,
  onGenerateSummary,
  summary,
  loading = false
}) => {
  const [showStats, setShowStats] = useState(false);

  const formatLastActivity = (date?: Date) => {
    if (!date) return 'No recent activity';
    
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const getActivityColor = (messageCount?: number) => {
    if (!messageCount) return 'text-gray-400';
    if (messageCount > 100) return 'text-green-400';
    if (messageCount > 50) return 'text-yellow-400';
    if (messageCount > 10) return 'text-blue-400';
    return 'text-gray-300';
  };

  const getActivityLevel = (messageCount?: number) => {
    if (!messageCount) return 'Inactive';
    if (messageCount > 100) return 'Very Active';
    if (messageCount > 50) return 'Active';
    if (messageCount > 10) return 'Moderate';
    return 'Low';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className="w-full"
    >
      <GlassCard 
        className={`p-6 cursor-pointer transition-all duration-300 ${
          group.isSelected 
            ? 'ring-2 ring-violet-400 bg-violet-500/10' 
            : 'hover:bg-white/5'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div 
                className={`w-3 h-3 rounded-full ${
                  group.messageCount && group.messageCount > 0 ? 'bg-green-400' : 'bg-gray-400'
                }`} 
              />
              <h3 className="text-lg font-semibold text-white truncate">
                {group.name}
              </h3>
              {summary && (
                <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded-full">
                  <Sparkles className="w-3 h-3 text-green-400" />
                  <span className="text-xs text-green-300">Summary Ready</span>
                </div>
              )}
            </div>
            
            {/* Quick Stats */}
            <div className="flex items-center gap-4 text-sm text-blue-200/70">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{group.participantCount || 0} members</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageSquare className={`w-4 h-4 ${getActivityColor(group.messageCount)}`} />
                <span className={getActivityColor(group.messageCount)}>
                  {group.messageCount || 0} messages
                </span>
              </div>
            </div>
          </div>

          {/* Activity Indicator */}
          <div className="text-right">
            <div className={`text-xs px-2 py-1 rounded-full ${
              getActivityLevel(group.messageCount) === 'Very Active' ? 'bg-green-500/20 text-green-300' :
              getActivityLevel(group.messageCount) === 'Active' ? 'bg-yellow-500/20 text-yellow-300' :
              getActivityLevel(group.messageCount) === 'Moderate' ? 'bg-blue-500/20 text-blue-300' :
              'bg-gray-500/20 text-gray-300'
            }`}>
              {getActivityLevel(group.messageCount)}
            </div>
          </div>
        </div>

        {/* Summary Preview */}
        {summary && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-4 p-3 bg-violet-500/10 rounded-lg border border-violet-400/20"
          >
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-violet-400" />
              <span className="text-sm font-medium text-violet-200">Latest Summary</span>
              <span className="text-xs text-violet-300/70">
                {summary.timeRange.start.toLocaleDateString()}
              </span>
            </div>
            <p className="text-sm text-white/90 line-clamp-2">
              {summary.overallSummary}
            </p>
            <div className="flex items-center gap-4 mt-2 text-xs text-violet-300/70">
              <span>{summary.totalMessages} messages</span>
              <span>{summary.activeParticipants} participants</span>
              <span>{summary.topKeywords.length} topics</span>
            </div>
          </motion.div>
        )}

        {/* Last Activity */}
        {group.lastActivity && (
          <div className="flex items-center gap-2 mb-4 text-xs text-blue-300/70">
            <Clock className="w-3 h-3" />
            <span>Last activity: {formatLastActivity(group.lastActivity)}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {/* Select/Deselect Button */}
          <Button
            onClick={() => onToggle(group.id)}
            variant={group.isSelected ? 'default' : 'outline'}
            size="sm"
            className={`flex-1 ${
              group.isSelected 
                ? 'bg-violet-500 hover:bg-violet-600 text-white' 
                : 'border-white/30 text-white hover:bg-white/10'
            }`}
          >
            <Activity className="w-4 h-4 mr-2" />
            {group.isSelected ? 'Selected' : 'Select'}
          </Button>

          {/* Daily Summary Button */}
          <Button
            onClick={() => onGenerateSummary(group.id)}
            disabled={loading || !group.messageCount || group.messageCount === 0}
            className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
            size="sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Calendar className="w-4 h-4 mr-2" />
                Daily Summary
              </>
            )}
          </Button>
        </div>

        {/* Expand Stats Button */}
        {group.messageCount && group.messageCount > 0 && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <Button
              onClick={() => setShowStats(!showStats)}
              variant="ghost"
              size="sm"
              className="w-full text-blue-300 hover:bg-blue-500/10"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              {showStats ? 'Hide Stats' : 'View Stats'}
            </Button>

            {/* Expanded Stats */}
            {showStats && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-3 p-3 bg-white/5 rounded-lg"
              >
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="text-center">
                    <div className="text-white font-semibold">
                      {Math.round((group.messageCount || 0) / 7)}
                    </div>
                    <div className="text-blue-300/70">Avg/day</div>
                  </div>
                  <div className="text-center">
                    <div className="text-white font-semibold">
                      {group.participantCount || 0}
                    </div>
                    <div className="text-blue-300/70">Members</div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
};

export default GroupCard;