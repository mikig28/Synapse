import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { 
  X, 
  Download, 
  Users, 
  MessageSquare, 
  Clock, 
  TrendingUp,
  Hash,
  Smile,
  BarChart3,
  User,
  Activity,
  Calendar,
  Zap,
  Target,
  Timer
} from 'lucide-react';
import { SummaryDisplayProps } from '@/types/whatsappSummary';

const SummaryModal: React.FC<SummaryDisplayProps> = ({
  summary,
  onClose,
  loading = false
}) => {
  const formatTimeRange = () => {
    const start = summary.timeRange.start;
    const end = summary.timeRange.end;
    const startDate = start.toLocaleDateString();
    const endDate = end.toLocaleDateString();
    
    if (startDate === endDate) {
      return startDate;
    }
    return `${startDate} - ${endDate}`;
  };

  const formatHour = (hour: number) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: true
    }).format(new Date().setHours(hour, 0, 0, 0));
  };

  const downloadSummary = () => {
    const content = generateSummaryText();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${summary.groupName}_summary_${summary.timeRange.start.toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateSummaryText = () => {
    let content = `WhatsApp Group Summary: ${summary.groupName}\n`;
    content += `Date: ${formatTimeRange()}\n`;
    content += `Generated: ${new Date().toLocaleString()}\n\n`;
    
    content += `=== OVERVIEW ===\n`;
    content += `${summary.overallSummary}\n\n`;
    
    content += `=== STATISTICS ===\n`;
    content += `Total Messages: ${summary.totalMessages}\n`;
    content += `Active Participants: ${summary.activeParticipants}\n`;
    content += `Processing Time: ${summary.processingStats.processingTimeMs}ms\n\n`;
    
    if (summary.topKeywords.length > 0) {
      content += `=== TOP KEYWORDS ===\n`;
      summary.topKeywords.forEach((keyword, i) => {
        content += `${i + 1}. ${keyword.keyword} (${keyword.count} times, ${keyword.percentage}%)\n`;
      });
      content += '\n';
    }
    
    if (summary.topEmojis.length > 0) {
      content += `=== TOP EMOJIS ===\n`;
      summary.topEmojis.forEach((emoji, i) => {
        content += `${i + 1}. ${emoji.emoji} (${emoji.count} times, ${emoji.percentage}%)\n`;
      });
      content += '\n';
    }
    
    if (summary.senderInsights.length > 0) {
      content += `=== PARTICIPANT INSIGHTS ===\n`;
      summary.senderInsights.forEach((sender) => {
        content += `${sender.senderName}:\n`;
        content += `  Messages: ${sender.messageCount}\n`;
        content += `  Summary: ${sender.summary}\n`;
        if (sender.topKeywords.length > 0) {
          content += `  Top Keywords: ${sender.topKeywords.map(k => k.keyword).join(', ')}\n`;
        }
        if (sender.topEmojis.length > 0) {
          content += `  Top Emojis: ${sender.topEmojis.map(e => e.emoji).join(' ')}\n`;
        }
        content += `  Peak Hour: ${formatHour(sender.activityPattern.peakHour)}\n`;
        content += `  Avg Message Length: ${sender.engagement.averageMessageLength} chars\n\n`;
      });
    }
    
    if (summary.activityPeaks.length > 0) {
      content += `=== ACTIVITY PEAKS ===\n`;
      summary.activityPeaks.forEach((peak, i) => {
        content += `${i + 1}. ${formatHour(peak.hour)} - ${peak.count} messages\n`;
      });
      content += '\n';
    }
    
    content += `=== MESSAGE TYPES ===\n`;
    content += `Text: ${summary.messageTypes.text}\n`;
    content += `Images: ${summary.messageTypes.image}\n`;
    content += `Videos: ${summary.messageTypes.video}\n`;
    content += `Audio: ${summary.messageTypes.audio}\n`;
    content += `Documents: ${summary.messageTypes.document}\n`;
    content += `Other: ${summary.messageTypes.other}\n`;
    
    return content;
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          className="max-w-md w-full"
        >
          <GlassCard className="p-8 text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-400"></div>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Generating Summary</h3>
            <p className="text-blue-200/70">
              Analyzing messages and creating insights...
            </p>
          </GlassCard>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center items-stretch sm:items-center p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-6xl overflow-hidden h-[calc(100vh-2rem)] supports-[height:100dvh]:h-[calc(100dvh-2rem)] sm:h-auto sm:max-h-[90vh]"
        >
          <GlassCard className="h-full" contentClassName="flex flex-col h-full min-h-0">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <BarChart3 className="w-6 h-6 text-violet-400" />
                  {summary.groupName} - Daily Summary
                </h2>
                <div className="flex items-center gap-4 mt-2 text-sm text-blue-200/70">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{formatTimeRange()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Timer className="w-4 h-4" />
                    <span>Processed in {summary.processingStats.processingTimeMs}ms</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  onClick={downloadSummary}
                  variant="outline"
                  size="sm"
                  className="border-white/30 text-white hover:bg-white/10"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Button
                  onClick={onClose}
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <ScrollArea type="always" className="flex-1 min-h-0">
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column - Overview & Stats */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Overview */}
                    <GlassCard className="p-4">
                      <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                        <Zap className="w-5 h-5 text-yellow-400" />
                        Summary Overview
                      </h3>
                      <p className="text-white/90 leading-relaxed">
                        {summary.overallSummary}
                      </p>
                    </GlassCard>

                    {/* Key Statistics */}
                    <GlassCard className="p-4">
                      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Target className="w-5 h-5 text-green-400" />
                        Key Statistics
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-white/5 rounded-lg">
                          <MessageSquare className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                          <div className="text-xl font-bold text-white">{summary.totalMessages}</div>
                          <div className="text-xs text-blue-300/70">Messages</div>
                        </div>
                        <div className="text-center p-3 bg-white/5 rounded-lg">
                          <Users className="w-6 h-6 text-green-400 mx-auto mb-2" />
                          <div className="text-xl font-bold text-white">{summary.activeParticipants}</div>
                          <div className="text-xs text-blue-300/70">Participants</div>
                        </div>
                        <div className="text-center p-3 bg-white/5 rounded-lg">
                          <Hash className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                          <div className="text-xl font-bold text-white">{summary.topKeywords.length}</div>
                          <div className="text-xs text-blue-300/70">Topics</div>
                        </div>
                        <div className="text-center p-3 bg-white/5 rounded-lg">
                          <Smile className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                          <div className="text-xl font-bold text-white">{summary.topEmojis.length}</div>
                          <div className="text-xs text-blue-300/70">Emojis</div>
                        </div>
                      </div>
                    </GlassCard>

                    {/* Message Types */}
                    <GlassCard className="p-4">
                      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-blue-400" />
                        Message Types
                      </h3>
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                        {Object.entries(summary.messageTypes).map(([type, count]) => (
                          <div key={type} className="text-center p-2 bg-white/5 rounded">
                            <div className="text-lg font-bold text-white">{count}</div>
                            <div className="text-xs text-blue-300/70 capitalize">{type}</div>
                          </div>
                        ))}
                      </div>
                    </GlassCard>
                  </div>

                  {/* Right Column - Insights */}
                  <div className="space-y-6">
                    {/* Top Keywords */}
                    {summary.topKeywords.length > 0 && (
                      <GlassCard className="p-4">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                          <Hash className="w-5 h-5 text-purple-400" />
                          Top Keywords
                        </h3>
                        <div className="space-y-2">
                          {summary.topKeywords.slice(0, 8).map((keyword) => (
                            <div key={keyword.keyword} className="flex items-center justify-between">
                              <span className="text-white text-sm truncate">{keyword.keyword}</span>
                              <div className="flex items-center gap-2">
                                <div className="text-xs text-blue-300/70">{keyword.count}</div>
                                <div className="w-8 h-2 bg-white/10 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-purple-400 rounded-full"
                                    style={{ width: `${keyword.percentage}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </GlassCard>
                    )}

                    {/* Top Emojis */}
                    {summary.topEmojis.length > 0 && (
                      <GlassCard className="p-4">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                          <Smile className="w-5 h-5 text-yellow-400" />
                          Top Emojis
                        </h3>
                        <div className="grid grid-cols-4 gap-3">
                          {summary.topEmojis.slice(0, 8).map((emoji) => (
                            <div key={emoji.emoji} className="text-center p-2 bg-white/5 rounded">
                              <div className="text-2xl mb-1">{emoji.emoji}</div>
                              <div className="text-xs text-blue-300/70">{emoji.count}</div>
                            </div>
                          ))}
                        </div>
                      </GlassCard>
                    )}

                    {/* Activity Peaks */}
                    {summary.activityPeaks.length > 0 && (
                      <GlassCard className="p-4">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                          <Activity className="w-5 h-5 text-green-400" />
                          Peak Hours
                        </h3>
                        <div className="space-y-2">
                          {summary.activityPeaks.slice(0, 5).map((peak) => (
                            <div key={peak.hour} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-green-400" />
                                <span className="text-white text-sm">{formatHour(peak.hour)}</span>
                              </div>
                              <span className="text-green-300 text-sm font-medium">{peak.count} msgs</span>
                            </div>
                          ))}
                        </div>
                      </GlassCard>
                    )}
                  </div>
                </div>

                {/* Participant Insights */}
                {summary.senderInsights.length > 0 && (
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                      <User className="w-5 h-5 text-blue-400" />
                      Participant Insights
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {summary.senderInsights.map((sender) => (
                        <GlassCard key={sender.senderPhone} className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-white truncate">{sender.senderName}</h4>
                            <div className="text-right">
                              <div className="text-sm font-medium text-violet-300">{sender.messageCount} msgs</div>
                              <div className="text-xs text-blue-300/70">
                                Peak: {formatHour(sender.activityPattern.peakHour)}
                              </div>
                            </div>
                          </div>

                          <p className="text-sm text-white/90 mb-3 leading-relaxed">
                            {sender.summary}
                          </p>

                          <div className="flex items-center justify-between text-xs text-blue-300/70">
                            <span>Avg: {sender.engagement.averageMessageLength} chars</span>
                            {sender.engagement.mediaCount > 0 && (
                              <span>{sender.engagement.mediaCount} media</span>
                            )}
                            {sender.engagement.questionCount > 0 && (
                              <span>{sender.engagement.questionCount} questions</span>
                            )}
                          </div>

                          {/* Quick insights */}
                          <div className="mt-2 flex flex-wrap gap-1">
                            {sender.topKeywords.slice(0, 3).map((keyword) => (
                              <span key={keyword.keyword} className="px-2 py-1 bg-violet-500/20 text-violet-200 text-xs rounded-full">
                                {keyword.keyword}
                              </span>
                            ))}
                            {sender.topEmojis.slice(0, 3).map((emoji) => (
                              <span key={emoji.emoji} className="text-sm">
                                {emoji.emoji}
                              </span>
                            ))}
                          </div>
                        </GlassCard>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </GlassCard>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SummaryModal;
