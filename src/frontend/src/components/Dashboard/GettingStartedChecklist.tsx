import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  Circle,
  X,
  Sparkles,
  Upload,
  MessageSquare,
  Bot,
  Search,
  ChevronRight
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import documentService from '@/services/documentService';
import whatsappService from '@/services/whatsappService';
import { agentService } from '@/services/agentService';
import telegramBotService from '@/services/telegramBotService';
import { useOnboardingStore } from '@/store/onboardingStore';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  icon: any;
  completed: boolean;
  action: string;
  actionPath: string;
}

const SEARCH_COMPLETED_STORAGE_KEY = 'getting-started-search-completed';

const getSearchCompletionFromStorage = () => {
  if (typeof window === 'undefined') {
    return false;
  }
  return localStorage.getItem(SEARCH_COMPLETED_STORAGE_KEY) === 'true';
};

const createInitialItems = (): ChecklistItem[] => {
  const hasUsedSearch = getSearchCompletionFromStorage();

  return [
    {
      id: 'upload-document',
      title: 'Upload your first document',
      description: 'Add a PDF, Word doc, or text file to your knowledge base',
      icon: Upload,
      completed: false,
      action: 'Upload',
      actionPath: '/docs',
    },
    {
      id: 'connect-messenger',
      title: 'Connect a messaging app',
      description: 'Link WhatsApp or Telegram to capture conversations',
      icon: MessageSquare,
      completed: false,
      action: 'Connect',
      actionPath: '/whatsapp',
    },
    {
      id: 'create-agent',
      title: 'Create your first AI agent',
      description: 'Set up automation to organize and analyze your data',
      icon: Bot,
      completed: false,
      action: 'Create',
      actionPath: '/agents',
    },
    {
      id: 'try-search',
      title: 'Try the AI-powered search',
      description: 'Search across all your connected knowledge instantly',
      icon: Search,
      completed: hasUsedSearch,
      action: 'Search',
      actionPath: '/search',
    },
  ];
};

export const GettingStartedChecklist: React.FC = () => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [items, setItems] = useState<ChecklistItem[]>(() => createInitialItems());
  const { onboardingDismissed, progress } = useOnboardingStore();

  const navigate = useNavigate();

  // If user has completed the full onboarding flow, hide the checklist
  const hasCompletedOnboarding = onboardingDismissed || (progress.completedSteps && progress.completedSteps.length >= 4);
  const updateSearchCompletion = useCallback(() => {
    const hasUsedSearch = getSearchCompletionFromStorage();
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === 'try-search' ? { ...item, completed: hasUsedSearch } : item
      )
    );
  }, []);

  // Check completion status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const [docsRes, whatsappRes, telegramRes, agentsRes] = await Promise.allSettled([
          documentService.getDocumentStats(),
          whatsappService.getConnectionStatus(),
          telegramBotService.getBotStatus(),
          agentService.getAgents(),
        ]);

        setItems((prevItems) =>
          prevItems.map((item) => {
            let completed = item.completed;

            if (item.id === 'upload-document' && docsRes.status === 'fulfilled') {
              completed = docsRes.value.totalDocuments > 0;
            } else if (item.id === 'connect-messenger') {
              const whatsappConnected =
                whatsappRes.status === 'fulfilled' && whatsappRes.value?.connected;
              const telegramConnected =
                telegramRes.status === 'fulfilled' &&
                telegramRes.value?.hasBot &&
                telegramRes.value?.isActive;
              completed = whatsappConnected || telegramConnected;
            } else if (item.id === 'create-agent' && agentsRes.status === 'fulfilled') {
              completed = agentsRes.value.length > 0;
            } else if (item.id === 'try-search') {
              completed = getSearchCompletionFromStorage();
            }

            return { ...item, completed };
          })
        );
      } catch (error) {
        console.error('[GettingStartedChecklist] Failed to check status:', error);
      }
    };

    checkStatus();
    // Refresh every 30 seconds
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Load dismissed state from localStorage or onboarding store
  useEffect(() => {
    const dismissed = localStorage.getItem('getting-started-dismissed');
    if (dismissed === 'true' || hasCompletedOnboarding) {
      setIsDismissed(true);
    }
  }, [hasCompletedOnboarding]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleSearchUsed = () => {
      updateSearchCompletion();
    };

    window.addEventListener('getting-started-search-used', handleSearchUsed);

    return () => {
      window.removeEventListener('getting-started-search-used', handleSearchUsed);
    };
  }, [updateSearchCompletion]);

  const completedCount = items.filter((item) => item.completed).length;
  const totalCount = items.length;
  const completionProgress = (completedCount / totalCount) * 100;

  const handleDismiss = () => {
    setIsDismissed(true);
    // Set both local storage and let the store know
    localStorage.setItem('getting-started-dismissed', 'true');
  };

  const handleAction = (path: string) => {
    navigate(path);
  };

  if (isDismissed) {
    return null;
  }

  if (completedCount === totalCount) {
    // Show congratulations and auto-dismiss after a few seconds
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.5 }}
        className="mb-6"
      >
        <GlassCard className="p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-500/20 rounded-full">
                <Sparkles className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  You're all set!
                </h3>
                <p className="text-sm text-muted-foreground">
                  Great job! You've completed the essentials. Now explore all Synapse has to offer.
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleDismiss}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </GlassCard>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-6"
    >
      <GlassCard className="overflow-hidden border-2 border-primary/30">
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Getting Started</h3>
                <p className="text-sm text-muted-foreground">
                  Complete these steps to unlock the power of Synapse
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-muted-foreground hover:text-foreground"
              >
                {isExpanded ? 'Collapse' : 'Expand'}
              </Button>
              <Button variant="ghost" size="icon" onClick={handleDismiss}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">
                {completedCount} of {totalCount} completed
              </span>
              <span className="font-semibold text-foreground">{Math.round(completionProgress)}%</span>
            </div>
            <Progress value={completionProgress} className="h-2" />
          </div>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-3 overflow-hidden"
              >
                {items.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`
                        flex items-center justify-between p-4 rounded-lg border transition-all duration-200
                        ${
                          item.completed
                            ? 'bg-green-500/5 border-green-500/20'
                            : 'bg-background/60 border-border/40 hover:bg-background/80'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          {item.completed ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          ) : (
                            <Circle className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                        <Icon
                          className={`w-5 h-5 flex-shrink-0 ${
                            item.completed ? 'text-green-500' : 'text-primary'
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-foreground truncate">
                            {item.title}
                          </h4>
                          <p className="text-xs text-muted-foreground truncate">
                            {item.description}
                          </p>
                        </div>
                      </div>
                      {!item.completed && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAction(item.actionPath)}
                          className="flex-shrink-0 ml-3"
                        >
                          {item.action}
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      )}
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </GlassCard>
    </motion.div>
  );
};
