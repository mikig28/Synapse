import React, { useState, useEffect, FormEvent } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Bell } from 'lucide-react';
import LocationPicker, { LocationData } from '@/components/location/LocationPicker';

// Re-using the Task interface, assuming it might be moved to a shared types file later
interface Task {
  _id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'deferred';
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
  reminderEnabled?: boolean;
  source?: string;
  telegramMessageId?: string;
  location?: LocationData;
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
  const [status, setStatus] = useState<Task['status']>('pending');
  const [priority, setPriority] = useState<Task['priority'] | undefined>('medium');
  const [dueDate, setDueDate] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [location, setLocation] = useState<LocationData | null>(null);

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setStatus(task.status || 'pending');
      setPriority(task.priority || 'medium');
      setDueDate(task.dueDate ? task.dueDate.split('T')[0] : ''); // Format for date input
      setReminderEnabled(task.reminderEnabled || false);
      setLocation(task.location || null);
    } else {
      // Reset form if no task is provided (e.g. modal closed and reopened for a new task later, though not current use case)
      setTitle('');
      setDescription('');
      setStatus('pending');
      setPriority('medium');
      setDueDate('');
      setReminderEnabled(false);
      setLocation(null);
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
      dueDate: dueDate || undefined,
      reminderEnabled,
      location: location || undefined,
    };
    onSave(updatedTaskData);
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="w-full max-w-md"
      >
        <GlassCard className="p-6 md:p-8">
          <h2 className="text-2xl font-semibold mb-6 text-foreground text-center">Edit Task</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title" className="text-muted-foreground">Title</Label>
              <Input 
                type="text" 
                id="title" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                className="mt-1 bg-background/50 border-border/50 focus:border-primary focus:ring-primary"
                required 
              />
            </div>
            <div>
              <Label htmlFor="description" className="text-muted-foreground">Description</Label>
              <Textarea 
                id="description" 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                rows={4}
                className="mt-1 bg-background/50 border-border/50 focus:border-primary focus:ring-primary"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status" className="text-muted-foreground">Status</Label>
                <Select value={status} onValueChange={(value) => setStatus(value as Task['status'])}>
                  <SelectTrigger id="status" className="mt-1 w-full bg-background/50 border-border/50 focus:border-primary focus:ring-primary">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="bg-background/90 border-border/70 backdrop-blur-md">
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="deferred">Deferred</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="priority" className="text-muted-foreground">Priority</Label>
                <Select value={priority || 'medium'} onValueChange={(value) => setPriority(value as Task['priority'])}>
                  <SelectTrigger id="priority" className="mt-1 w-full bg-background/50 border-border/50 focus:border-primary focus:ring-primary">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent className="bg-background/90 border-border/70 backdrop-blur-md">
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="dueDate" className="text-muted-foreground">Due Date</Label>
              <Input
                type="date"
                id="dueDate"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1 bg-background/50 border-border/50 focus:border-primary focus:ring-primary"
              />
            </div>
            
            <div className="mb-4">
              <LocationPicker
                initialLocation={location}
                onLocationSelect={setLocation}
              />
            </div>
            
            <div className="flex items-center justify-between p-4 bg-background/20 rounded-lg border border-border/30">
              <div className="flex items-center space-x-3">
                <Bell className="w-5 h-5 text-primary" />
                <div>
                  <Label htmlFor="reminderEnabled" className="text-muted-foreground font-medium">Telegram Reminder</Label>
                  <p className="text-xs text-muted-foreground/70">Get daily reminder notifications in Telegram</p>
                </div>
              </div>
              <Switch
                id="reminderEnabled"
                checked={reminderEnabled}
                onCheckedChange={setReminderEnabled}
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <AnimatedButton type="button" onClick={onClose} variant="outline" className="border-muted-foreground/50 text-muted-foreground hover:bg-muted/20">
                Cancel
              </AnimatedButton>
              <AnimatedButton type="submit" variant="primary">
                Save Changes
              </AnimatedButton>
            </div>
          </form>
        </GlassCard>
      </motion.div>
    </div>
  );
};

export default EditTaskModal; 