import React, { useState } from 'react';
import { Task } from '../../../types/task';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import axiosInstance from '@/services/axiosConfig';
import { X } from 'lucide-react';

interface AddToCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
  onEventAdded: () => void; // Callback to refresh calendar or notify parent
}

const AddToCalendarModal: React.FC<AddToCalendarModalProps> = ({ isOpen, onClose, task, onEventAdded }) => {
  const { toast } = useToast();
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState<string>('09:00');
  const [durationHours, setDurationHours] = useState<string>('1'); // Duration in hours
  const [description, setDescription] = useState<string>(task.description || '');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const startDateTime = new Date(`${startDate}T${startTime}`);
    if (isNaN(startDateTime.getTime())) {
      toast({ title: "Invalid Date/Time", description: "Please enter a valid start date and time.", variant: "destructive" });
      setIsSaving(false);
      return;
    }

    const durationMs = parseInt(durationHours, 10) * 60 * 60 * 1000;
    if (isNaN(durationMs) || durationMs <= 0) {
        toast({ title: "Invalid Duration", description: "Please enter a valid duration in hours.", variant: "destructive" });
        setIsSaving(false);
        return;
    }
    const endDateTime = new Date(startDateTime.getTime() + durationMs);

    const calendarEventData = {
      title: task.title,
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      description: description,
      // Default color or allow user to pick one if feature is added
      color: 'bg-purple-500', // Example default color
    };

    try {
      await axiosInstance.post('/calendar-events', calendarEventData);
      toast({ title: "Event Added", description: `"${task.title}" added to calendar.` });
      onEventAdded(); // Notify parent component
      onClose();
    } catch (error: any) {
      const errMsg = error.response?.data?.message || error.message || 'Failed to add event to calendar.';
      console.error("Error adding event to calendar:", errMsg);
      toast({ title: "Error", description: errMsg, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 p-6 rounded-xl shadow-2xl w-full max-w-md border border-slate-700">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-white">Add "{task.title}" to Calendar</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X size={24} />
          </Button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="startDate" className="block text-sm font-medium text-slate-300 mb-1">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:ring-purple-500 focus:border-purple-500"
              required
            />
          </div>
          <div>
            <Label htmlFor="startTime" className="block text-sm font-medium text-slate-300 mb-1">Start Time</Label>
            <Input
              id="startTime"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:ring-purple-500 focus:border-purple-500"
              required
            />
          </div>
          <div>
            <Label htmlFor="durationHours" className="block text-sm font-medium text-slate-300 mb-1">Duration (Hours)</Label>
            <Input
              id="durationHours"
              type="number"
              value={durationHours}
              onChange={(e) => setDurationHours(e.target.value)}
              min="0.25"
              step="0.25"
              className="bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:ring-purple-500 focus:border-purple-500"
              required
            />
          </div>
           <div>
            <Label htmlFor="description" className="block text-sm font-medium text-slate-300 mb-1">Description (Optional)</Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-slate-700 border-slate-600 rounded-md p-2 text-sm text-white placeholder-slate-400 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Event description..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving} className="text-slate-300 hover:bg-slate-700 border-slate-600">
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving} className="bg-purple-600 hover:bg-purple-700 text-white">
              {isSaving ? 'Saving...' : 'Add to Calendar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddToCalendarModal;
