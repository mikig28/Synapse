import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useOnboardingStore } from '@/store/onboardingStore';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { FileText, CheckSquare, Lightbulb, Calendar, CheckCircle } from 'lucide-react';

export const OrganizeContentStep: React.FC = () => {
  const { completeStep, showAchievement } = useOnboardingStore();
  const [completedActions, setCompletedActions] = useState<string[]>([]);

  const actions = [
    {
      id: 'create-note',
      title: 'Create Your First Note',
      description: 'Capture ideas and thoughts quickly',
      icon: <FileText className="w-5 h-5 text-blue-400" />
    },
    {
      id: 'add-task',
      title: 'Add a Task',
      description: 'Keep track of your to-dos',
      icon: <CheckSquare className="w-5 h-5 text-green-400" />
    },
    {
      id: 'save-idea',
      title: 'Save an Idea',
      description: 'Store creative thoughts for later',
      icon: <Lightbulb className="w-5 h-5 text-yellow-400" />
    }
  ];

  const handleAction = (actionId: string) => {
    if (!completedActions.includes(actionId)) {
      setCompletedActions([...completedActions, actionId]);
      showAchievement(`✅ ${actions.find(a => a.id === actionId)?.title} completed!`);
      
      if (completedActions.length >= 1) { // Complete after 2 actions
        setTimeout(() => completeStep('organize-content'), 1000);
      }
    }
  };

  return (
    <div className="space-y-8">
      <motion.div 
        className="text-center space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-6xl mb-4">📝</div>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">
          Organize Your Knowledge
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Learn how to create and organize your content with notes, tasks, and ideas.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-6">
        {actions.map((action, index) => (
          <GlassCard key={action.id} className="p-6 cursor-pointer" onClick={() => handleAction(action.id)}>
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-3 bg-muted/30 rounded-lg">
                  {action.icon}
                </div>
              </div>
              <h3 className="font-semibold text-foreground">{action.title}</h3>
              <p className="text-sm text-muted-foreground">{action.description}</p>
              {completedActions.includes(action.id) ? (
                <div className="flex items-center justify-center gap-2 text-green-500">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">Completed</span>
                </div>
              ) : (
                <Button size="sm">Try it</Button>
              )}
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
};