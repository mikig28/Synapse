import React, { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';

interface CalendarEvent {
  id: number;
  title: string;
  startTime: string;
  endTime: string;
}

const STORAGE_KEY = 'calendarEvents';

const UpcomingEvents: React.FC = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const loadEvents = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Array<Omit<CalendarEvent, 'startTime' | 'endTime'> & { startTime: string; endTime: string }>;
        setEvents(parsed.map(e => ({ ...e, startTime: e.startTime, endTime: e.endTime })));
      } else {
        setEvents([]);
      }
    } catch (err) {
      console.error('Failed to load calendar events:', err);
      setEvents([]);
    }
  };

  useEffect(() => {
    loadEvents();
    const handleUpdate = () => loadEvents();
    window.addEventListener('calendarEventsUpdated', handleUpdate);
    return () => {
      window.removeEventListener('calendarEventsUpdated', handleUpdate);
    };
  }, []);

  const upcoming = events
    .map(e => ({ ...e, date: new Date(e.startTime) }))
    .filter(e => e.date >= new Date())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 5);

  if (upcoming.length === 0) {
    return null;
  }

  return (
    <GlassCard className="mb-6">
      <div className="p-6">
        <div className="flex items-center mb-4">
          <Calendar className="w-5 h-5 text-primary mr-2" />
          <h3 className="text-lg font-semibold">Upcoming Tasks</h3>
        </div>
        <ul className="space-y-2">
          {upcoming.map(event => (
            <li key={event.id} className="flex justify-between text-sm">
              <span className="font-medium text-foreground truncate mr-2">{event.title}</span>
              <span className="text-muted-foreground whitespace-nowrap">
                {new Date(event.startTime).toLocaleDateString()} {new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </GlassCard>
  );
};

export default UpcomingEvents;
