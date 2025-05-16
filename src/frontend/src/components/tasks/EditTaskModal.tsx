import React, { useState, useEffect, FormEvent } from 'react';

// Re-using the Task interface, assuming it might be moved to a shared types file later
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

interface EditTaskModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedTask: Task) => void;
}

const EditTaskModal: React.FC<EditTaskModalProps> = ({ task, isOpen, onClose, onSave }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'pending' | 'in-progress' | 'completed' | 'deferred'>('pending');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | undefined>('medium');

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setStatus(task.status || 'pending');
      setPriority(task.priority || 'medium');
    } else {
      // Reset form if no task is provided (e.g. modal closed and reopened for a new task later, though not current use case)
      setTitle('');
      setDescription('');
      setStatus('pending');
      setPriority('medium');
    }
  }, [task]);

  if (!isOpen || !task) {
    return null;
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!task) return; // Should not happen if modal is open

    const updatedTaskData = {
      ...task, // Spread existing task data to keep fields like _id, createdAt, etc.
      title,
      description,
      status,
      priority,
    };
    onSave(updatedTaskData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-card p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4 text-card-foreground">Edit Task</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="title" className="block text-sm font-medium text-muted-foreground mb-1">Title</label>
            <input 
              type="text" 
              id="title" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              className="w-full p-2 border border-input rounded-md bg-background text-foreground"
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
              className="w-full p-2 border border-input rounded-md bg-background text-foreground"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="status" className="block text-sm font-medium text-muted-foreground mb-1">Status</label>
            <select 
              id="status" 
              value={status} 
              onChange={(e) => setStatus(e.target.value as Task['status'])} 
              className="w-full p-2 border border-input rounded-md bg-background text-foreground"
            >
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="deferred">Deferred</option>
            </select>
          </div>
          <div className="mb-4">
            <label htmlFor="priority" className="block text-sm font-medium text-muted-foreground mb-1">Priority</label>
            <select 
              id="priority" 
              value={priority || ''} // Handle undefined for select value
              onChange={(e) => setPriority(e.target.value as Task['priority'] || undefined)} 
              className="w-full p-2 border border-input rounded-md bg-background text-foreground"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className="flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-md border border-border hover:bg-muted">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTaskModal; 