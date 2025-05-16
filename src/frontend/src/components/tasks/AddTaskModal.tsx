import React, { useState, useEffect } from 'react';

// Define a local Task interface, mirroring the one in TasksPage.tsx
// Or, ideally, import from a shared types file like '@/types/task' if it exists
interface Task {
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

export interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newTaskData: Omit<Task, '_id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

const AddTaskModal: React.FC<AddTaskModalProps> = ({ isOpen, onClose, onSave }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'pending' | 'in-progress' | 'completed' | 'deferred'>('pending');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Reset form when modal is reopened, but not on initial mount if isOpen is true
    if (isOpen) {
      setTitle('');
      setDescription('');
      setStatus('pending');
      setPriority(undefined);
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    
    const newTaskData: Omit<Task, '_id' | 'createdAt' | 'updatedAt'> = {
      title,
      description: description || undefined,
      status,
      priority: priority || undefined,
      // source and telegramMessageId are not set by manual creation by default
    };

    try {
      await onSave(newTaskData);
      // onClose(); // The parent component will call onClose upon successful save in its onSave handler
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save task. Please try again.';
      console.error("Error in AddTaskModal onSave:", errorMessage);
      setError(errorMessage); 
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-card p-6 rounded-lg shadow-xl w-full max-w-lg text-card-foreground">
        <h2 className="text-xl font-semibold mb-4">Add New Task</h2>
        {error && <p className="text-red-500 bg-red-100 p-2 rounded mb-3 text-sm">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="title" className="block text-sm font-medium text-muted-foreground mb-1">Title <span className="text-red-500">*</span></label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2 border border-border rounded-md bg-input text-foreground focus:ring-primary focus:border-primary"
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="description" className="block text-sm font-medium text-muted-foreground mb-1">Description</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full p-2 border border-border rounded-md bg-input text-foreground focus:ring-primary focus:border-primary"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-muted-foreground mb-1">Status</label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as Task['status'])}
                className="w-full p-2 border border-border rounded-md bg-input text-foreground focus:ring-primary focus:border-primary"
              >
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="deferred">Deferred</option>
              </select>
            </div>
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-muted-foreground mb-1">Priority</label>
              <select
                id="priority"
                value={priority || ''}
                onChange={(e) => setPriority(e.target.value as Task['priority'])}
                className="w-full p-2 border border-border rounded-md bg-input text-foreground focus:ring-primary focus:border-primary"
              >
                <option value="">None</option> 
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end space-x-3">
            <button 
              type="button" 
              onClick={onClose} 
              disabled={isSubmitting}
              className="px-4 py-2 border border-border rounded-md text-sm font-medium text-muted-foreground hover:bg-muted/50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:bg-primary/70"
            >
              {isSubmitting ? 'Saving...' : 'Save Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTaskModal; 