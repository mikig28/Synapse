import React from 'react';
import { motion } from 'framer-motion';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { FileText, Bookmark, Calendar, Users, Play, Zap, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface QuickAction {
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  variant?: 'default' | 'primary' | 'secondary' | 'outline' | 'ghost';
  badge?: number;
}

interface QuickActionsBarProps {
  onAddNote?: () => void;
  customActions?: QuickAction[];
}

const QuickActionsBar: React.FC<QuickActionsBarProps> = ({
  onAddNote,
  customActions = []
}) => {
  const navigate = useNavigate();

  const defaultActions: QuickAction[] = [
    {
      label: 'New Note',
      icon: FileText,
      onClick: () => onAddNote?.(),
      variant: 'primary'
    },
    {
      label: 'Tasks',
      icon: Calendar,
      onClick: () => navigate('/tasks'),
      variant: 'outline'
    },
    {
      label: 'Bookmarks',
      icon: Bookmark,
      onClick: () => navigate('/bookmarks'),
      variant: 'outline'
    },
    {
      label: 'Agents',
      icon: Users,
      onClick: () => navigate('/agents'),
      variant: 'outline'
    },
    {
      label: 'Videos',
      icon: Play,
      onClick: () => navigate('/videos'),
      variant: 'outline'
    },
    {
      label: 'WhatsApp',
      icon: MessageSquare,
      onClick: () => navigate('/whatsapp-monitor'),
      variant: 'outline'
    }
  ];

  const actions = customActions.length > 0 ? customActions : defaultActions;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full"
    >
      <div className="bg-gradient-to-r from-background via-muted/10 to-background border border-border/40 rounded-xl p-3 sm:p-4 backdrop-blur-sm shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-1.5 bg-primary/10 rounded-full">
            <Zap className="w-4 h-4 text-primary" />
          </div>
          <h3 className="text-sm sm:text-base font-semibold">Quick Actions</h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3">
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <motion.div
                key={action.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
              >
                <AnimatedButton
                  variant={action.variant || 'outline'}
                  onClick={action.onClick}
                  className="w-full h-full flex flex-col items-center justify-center gap-1.5 sm:gap-2 p-3 sm:p-4 relative group"
                >
                  {action.badge !== undefined && action.badge > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                      {action.badge > 99 ? '99+' : action.badge}
                    </span>
                  )}
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform flex-shrink-0" />
                  <span className="text-xs font-medium text-center break-words">{action.label}</span>
                </AnimatedButton>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

export default QuickActionsBar;
