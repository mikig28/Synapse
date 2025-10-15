import React from 'react';
import { EmptyStateGuidance } from '@/components/ui/EmptyStateGuidance';
import { Target, Plus, Bell } from 'lucide-react';

/**
 * Test page to verify EmptyStateGuidance component renders correctly
 * Navigate to /test-empty-state to see it
 */
const EmptyStateTestPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-8">
      <h1 className="text-4xl font-bold text-white text-center mb-8">
        Empty State Guidance Test
      </h1>

      <EmptyStateGuidance
        icon={Target}
        title="Start Your Task Journey"
        description="You haven't created any tasks yet. Tasks help you organize your goals, track progress, and stay productive."
        suggestions={[
          'Create your first task to get started',
          'Use voice capture through Telegram or WhatsApp to quickly add tasks',
          'Import tasks from your calendar or notes',
          'Try the Kanban view to visualize your workflow',
        ]}
        actions={[
          {
            label: 'Create Your First Task',
            onClick: () => alert('Create task clicked!'),
            icon: Plus,
            primary: true,
          },
          {
            label: 'Send Task Reminder',
            onClick: () => alert('Send reminder clicked!'),
            icon: Bell,
            variant: 'outline',
          },
        ]}
      />
    </div>
  );
};

export default EmptyStateTestPage;
