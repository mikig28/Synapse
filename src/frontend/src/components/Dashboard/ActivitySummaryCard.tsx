import React from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { Activity, TrendingUp, TrendingDown } from 'lucide-react';

interface ActivityStat {
  label: string;
  value: number;
  change?: number;
  icon?: React.ReactNode;
}

interface ActivitySummaryCardProps {
  stats: ActivityStat[];
  timeframe?: string;
}

const ActivitySummaryCard: React.FC<ActivitySummaryCardProps> = ({
  stats,
  timeframe = 'Last 24 hours'
}) => {
  return (
    <GlassCard className="overflow-hidden">
      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-full">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold">Activity Summary</h3>
          </div>
          <span className="text-xs text-muted-foreground">{timeframe}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="flex flex-col gap-1 p-3 rounded-lg bg-background/60 border border-border/40"
            >
              {stat.icon && (
                <div className="text-muted-foreground mb-1">{stat.icon}</div>
              )}
              <div className="flex items-baseline gap-2">
                <span className="text-xl sm:text-2xl font-bold text-foreground">
                  {stat.value}
                </span>
                {stat.change !== undefined && stat.change !== 0 && (
                  <div className={`flex items-center gap-0.5 text-xs ${
                    stat.change > 0 ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {stat.change > 0 ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    <span>{Math.abs(stat.change)}%</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </GlassCard>
  );
};

export default ActivitySummaryCard;
