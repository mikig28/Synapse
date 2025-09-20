from pathlib import Path
path = Path('/mnt/c/Users/Miki_gabay/Desktop/Workspace/Synapse/src/frontend/src/components/whatsapp/SummaryModal.tsx')
text = path.read_text()
start = text.index('            <ScrollArea type="always" className="flex-1 min-h-0">')
end = text.index('            </ScrollArea>') + len('            </ScrollArea>')
block = '''            <ScrollArea type="always" className="flex-1 min-h-0">
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
                                    style={{ width:  }}
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
            </ScrollArea>"""
text = text[:start] + block + text[end:]
path.write_text(text)
EOF
python3 /mnt/c/Users/Miki_gabay/Desktop/Workspace/Synapse/replace_summary_modal.py
rm /mnt/c/Users/Miki_gabay/Desktop/Workspace/Synapse/replace_summary_modal.py
