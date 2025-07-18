import React, { useState, useEffect, FormEvent } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Bell } from 'lucide-react';
import LocationPicker, { LocationData } from '@/components/location/LocationPicker';

// Define a local Task interface, mirroring the one in TasksPage.tsx
// Or, ideally, import from a shared types file like '@/types/task' if it exists
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

export interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newTaskData: Omit<Task, '_id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

const AddTaskModal: React.FC<AddTaskModalProps> = ({ isOpen, onClose, onSave }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<Task['status']>('pending');
  const [priority, setPriority] = useState<Task['priority'] | undefined>(undefined);
  const [dueDate, setDueDate] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Reset form when modal is reopened, but not on initial mount if isOpen is true
    if (isOpen) {
      setTitle('');
      setDescription('');
      setStatus('pending');
      setPriority(undefined);
      setDueDate('');
      setReminderEnabled(false);
      setLocation(null);
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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
      dueDate: dueDate || undefined,
      reminderEnabled,
      location: location || undefined,
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
        className="w-full max-w-sm sm:max-w-md lg:max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <GlassCard className="p-4 sm:p-6 md:p-8">
          <h2 className="text-2xl font-semibold mb-6 text-foreground text-center">Add New Task</h2>
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
              <Alert variant="destructive" className="glass border-red-500/30 bg-red-500/10 text-red-200">
                <AlertCircle className="h-4 w-4 text-red-300" />
                <AlertTitle className="text-red-200 font-semibold">Error</AlertTitle>
                <AlertDescription className="text-red-300/90">{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title" className="text-muted-foreground">Title <span className="text-red-400">*</span></Label>
              <Input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 bg-background/50 border-border/50 focus:border-primary focus:ring-primary"
                required
                disabled={isSubmitting}
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
                disabled={isSubmitting}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status" className="text-muted-foreground">Status</Label>
                <Select value={status} onValueChange={(value) => setStatus(value as Task['status'])} disabled={isSubmitting}>
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
                <Select value={priority || ''} onValueChange={(value) => setPriority(value === 'none' ? undefined : (value as Task['priority']))} disabled={isSubmitting}>
                  <SelectTrigger id="priority" className="mt-1 w-full bg-background/50 border-border/50 focus:border-primary focus:ring-primary">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent className="bg-background/90 border-border/70 backdrop-blur-md">
                    <SelectItem value="none">None</SelectItem>
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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
              />
            </div>
            <div className="mb-4">
              <LocationPicker
                onLocationSelect={setLocation}
                disabled={isSubmitting}
              />
            </div>
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 sticky bottom-0 bg-background/50 backdrop-blur-sm rounded-b-lg -mx-4 sm:-mx-6 md:-mx-8 px-4 sm:px-6 md:px-8 pb-4">
              <AnimatedButton 
                type="button" 
                onClick={onClose} 
                variant="outline"
                disabled={isSubmitting}
                className="border-muted-foreground/50 text-muted-foreground hover:bg-muted/20"
              >
                Cancel
              </AnimatedButton>
              <AnimatedButton 
                type="submit" 
                variant="primary"
                loading={isSubmitting} // Use loading prop for AnimatedButton
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving Task...' : 'Save Task'} {/* AnimatedButton handles loading text internally if provided, or use children */} 
              </AnimatedButton>
            </div>
          </form>
        </GlassCard>
      </motion.div>
    </div>
  );
};

export default AddTaskModal; 