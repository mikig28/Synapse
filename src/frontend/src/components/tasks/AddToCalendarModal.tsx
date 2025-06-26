import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarPlus, X, Clock, Calendar, Type, Palette } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { GlassCard } from '@/components/ui/GlassCard';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Input } from '@/components/ui/input';
import { Task } from '../../../types/task';
import axiosInstance from '@/services/axiosConfig';

interface CalendarEvent {
  id: number | string; // Support both number and string IDs for flexibility
  title: string;
  startTime: Date;
  endTime: Date;
  color: string;
  description: string;
  location: string;
  attendees: string[];
  organizer: string;
}

interface AddToCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
  onEventAdded: () => void;
}

const AddToCalendarModal: React.FC<AddToCalendarModalProps> = ({
  isOpen,
  onClose,
  task,
  onEventAdded
}) => {
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState('60'); // minutes
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('bg-blue-500');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const calendarEventsLocalStorageKey = "calendarEvents";

  const colorOptions = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-red-500',
    'bg-yellow-500',
    'bg-orange-500',
    'bg-pink-500',
    'bg-indigo-500',
  ];

  useEffect(() => {
    if (isOpen && task) {
      // Set default description to task description
      setDescription(task.description || '');
      
      // Set default date to today
      const today = new Date();
      const formattedDate = today.toISOString().split('T')[0];
      setDate(formattedDate);
      
      // Set default time to next hour
      const nextHour = new Date(today.getTime() + 60 * 60 * 1000);
      const formattedTime = nextHour.toTimeString().slice(0, 5);
      setStartTime(formattedTime);
    }
  }, [isOpen, task]);

  const saveToBackend = async (eventData: CalendarEvent): Promise<boolean> => {
    try {
      console.log('[AddToCalendarModal] Saving event to backend:', eventData.title);
      
      const payload = {
        title: eventData.title,
        startTime: eventData.startTime.toISOString(),
        endTime: eventData.endTime.toISOString(),
        description: eventData.description,
        color: eventData.color,
        location: eventData.location || '',
        attendees: eventData.attendees || [],
        organizer: eventData.organizer || 'You',
      };

      const response = await axiosInstance.post('/calendar-events', payload);
      console.log('[AddToCalendarModal] ✅ Backend save successful:', response.data);
      return true;
    } catch (error) {
      console.error('[AddToCalendarModal] ❌ Backend save failed:', error);
      
      if (error.response?.status === 401) {
        toast({
          title: "Authentication Error",
          description: "Please log in to save calendar events.",
          variant: "destructive"
        });
      } else {
        const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
        toast({
          title: "Backend Save Failed",
          description: `Could not save to calendar: ${errorMessage}`,
          variant: "destructive"
        });
      }
      return false;
    }
  };

  const saveToLocalStorage = (eventData: CalendarEvent) => {
    try {
      console.log('[AddToCalendarModal] Saving event to localStorage as fallback');
      
      // Get existing events from localStorage
      let existingEvents: CalendarEvent[] = [];
      try {
        const storedEventsString = localStorage.getItem(calendarEventsLocalStorageKey);
        if (storedEventsString) {
          const parsedEvents = JSON.parse(storedEventsString) as Array<Omit<CalendarEvent, 'startTime' | 'endTime'> & { startTime: string; endTime: string }>;
          existingEvents = parsedEvents.map(event => ({
            ...event,
            startTime: new Date(event.startTime),
            endTime: new Date(event.endTime),
          }));
        }
      } catch (error) {
        console.error("Error reading existing events:", error);
        existingEvents = [];
      }

      // Add the new event
      const updatedEvents = [...existingEvents, eventData];

      // Save back to localStorage
      const eventsToStore = updatedEvents.map(event => ({
        ...event,
        startTime: event.startTime.toISOString(),
        endTime: event.endTime.toISOString(),
      }));
      localStorage.setItem(calendarEventsLocalStorageKey, JSON.stringify(eventsToStore));

      // Dispatch custom event to notify calendar page of changes (same-tab)
      window.dispatchEvent(new CustomEvent('calendarEventsUpdated'));
      console.log('[AddToCalendarModal] ✅ localStorage save successful');
    } catch (error) {
      console.error('[AddToCalendarModal] ❌ localStorage save failed:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!date || !startTime || !duration) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create start and end dates
      const startDateTime = new Date(`${date}T${startTime}`);
      const durationMinutes = parseInt(duration);
      const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000);

      // Validate dates
      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        throw new Error("Invalid date or time format");
      }

      if (endDateTime <= startDateTime) {
        throw new Error("End time must be after start time");
      }

      // Create the calendar event
      const newEvent: CalendarEvent = {
        id: Date.now(), // Simple unique ID for localStorage
        title: task.title,
        startTime: startDateTime,
        endTime: endDateTime,
        color: color,
        description: description || task.description || '',
        location: '',
        attendees: [],
        organizer: 'You',
      };

      // Try to save to backend first
      const backendSuccess = await saveToBackend(newEvent);
      
      if (backendSuccess) {
        // Backend save successful - also update localStorage for immediate UI updates
        saveToLocalStorage(newEvent);
        
        toast({
          title: "Success",
          description: `Task "${task.title}" has been added to your calendar and synced.`,
          variant: "default"
        });
      } else {
        // Backend failed - save to localStorage only and warn user
        saveToLocalStorage(newEvent);
        
        toast({
          title: "Partial Success",
          description: `Task "${task.title}" saved locally. It will sync when you're connected.`,
          variant: "default"
        });
      }

      // Call success callbacks
      onEventAdded();
      onClose();

    } catch (error) {
      console.error("Error adding event to calendar:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add event to calendar.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 }
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
        >
          <GlassCard className="w-full max-w-md mx-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <CalendarPlus className="w-6 h-6 text-purple-400" />
                <h2 className="text-xl font-semibold text-white">Add to Calendar</h2>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
                disabled={isSubmitting}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
              <h3 className="text-sm font-medium text-purple-300 mb-1">Task</h3>
              <p className="text-white font-medium">{task.title}</p>
              {task.description && (
                <p className="text-gray-300 text-sm mt-1">{task.description}</p>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                  <Calendar className="w-4 h-4" />
                  Date *
                </label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-white/5 border-white/10 text-white focus:border-purple-500 focus:ring-purple-500"
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                  <Clock className="w-4 h-4" />
                  Start Time *
                </label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="bg-white/5 border-white/10 text-white focus:border-purple-500 focus:ring-purple-500"
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                  <Clock className="w-4 h-4" />
                  Duration (minutes) *
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white focus:border-purple-500 focus:ring-purple-500 focus:outline-none"
                  disabled={isSubmitting}
                  required
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="90">1.5 hours</option>
                  <option value="120">2 hours</option>
                  <option value="180">3 hours</option>
                  <option value="240">4 hours</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                  <Type className="w-4 h-4" />
                  Additional Notes
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add any additional details..."
                  className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white placeholder-gray-400 focus:border-purple-500 focus:ring-purple-500 focus:outline-none resize-none h-20"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                  <Palette className="w-4 h-4" />
                  Color
                </label>
                <div className="flex gap-2 flex-wrap">
                  {colorOptions.map((colorOption) => (
                    <button
                      key={colorOption}
                      type="button"
                      onClick={() => setColor(colorOption)}
                      disabled={isSubmitting}
                      className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${colorOption} ${
                        color === colorOption ? 'border-white ring-2 ring-white/50' : 'border-gray-600'
                      } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <AnimatedButton
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1 border-gray-500/50 text-gray-300 hover:bg-gray-500/20"
                >
                  Cancel
                </AnimatedButton>
                <AnimatedButton
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-purple-500 hover:bg-purple-600 text-white disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <CalendarPlus className="w-4 h-4 mr-2" />
                      Add to Calendar
                    </>
                  )}
                </AnimatedButton>
              </div>
            </form>
          </GlassCard>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AddToCalendarModal; 