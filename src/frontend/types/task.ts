export interface Task {
  _id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'deferred';
  priority?: 'low' | 'medium' | 'high';
  source?: string;
  telegramMessageId?: string;
  createdAt: string;
  updatedAt: string;
} 