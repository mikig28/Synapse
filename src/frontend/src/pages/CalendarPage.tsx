"use client" // This directive is Next.js specific, can be removed for Vite/React

import { useState, useEffect, useRef } from "react"
// import Image from "next/image" // Replaced with standard img or placeholder
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Settings,
  Menu,
  Clock,
  MapPin,
  Users,
  Calendar as CalendarIcon, // Aliased to avoid conflict with potential Calendar component
  Pause, // For AI popup (currently disabled)
  Sparkles, // For AI popup (currently disabled)
  X, // For AI popup & selected event modal (currently disabled for AI popup)
  Trash2, // For delete button
  RefreshCw, // For sync button
  CheckCircle, // For sync status
  AlertCircle, // For sync errors
} from "lucide-react"
import axiosInstance from '@/services/axiosConfig';
import { useToast } from "@/hooks/use-toast";
import googleCalendarService from '@/services/googleCalendarService';
import googleAuthService from '@/services/googleAuthService';
import { useGoogleLogin } from '@react-oauth/google';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  format,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay, // 0 (Sun) to 6 (Sat)
  isToday,
  isSameMonth,
  isSameDay,
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  // parseISO // Might be needed if event dates are strings
} from "date-fns"

// Assuming you have a way to define your event types, or we can define a basic one.
// For now, I'll use \'any\' for selectedEvent to avoid blocking, but this should be typed.
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

// Helper function to compare dates by UTC values to avoid timezone issues
const isSameUTCDate = (dateLeft: Date, dateRight: Date): boolean => {
  return (
    dateLeft.getUTCFullYear() === dateRight.getUTCFullYear() &&
    dateLeft.getUTCMonth() === dateRight.getUTCMonth() &&
    dateLeft.getUTCDate() === dateRight.getUTCDate()
  );
};


export default function CalendarPage() { // Renamed from Home for clarity
  const [isLoaded, setIsLoaded] = useState(false);
  const { toast } = useToast();
  // const [showAIPopup, setShowAIPopup] = useState(false) // AI Popup logic remains commented out
  // const [typedText, setTypedText] = useState("")
  // const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    setIsLoaded(true)
    // AI Popup timer logic remains commented out
  }, [])

  // AI Popup typing useEffect remains commented out

  const calendarEventsLocalStorageKey = "calendarEvents";

  // Function to load events from backend API (primary source)
  const loadEventsFromBackend = async () => {
    try {
      console.log('[Frontend] Loading events from backend API...');
      const response = await axiosInstance.get('/calendar-events');
      const backendEvents = response.data.map((event: any) => ({
        id: event._id || event.id,
        title: event.title || 'Untitled Event',
        startTime: new Date(event.startTime),
        endTime: new Date(event.endTime),
        color: event.color || 'bg-blue-500',
        description: event.description || '',
        location: event.location || '',
        attendees: event.attendees || [],
        organizer: event.organizer || 'Unknown',
      }));
      
      console.log('[Frontend] ✅ Loaded', backendEvents.length, 'events from backend');
      console.log('[Frontend] Sample events:', backendEvents.slice(0, 3).map((e: CalendarEvent) => ({ title: e.title, color: e.color, syncStatus: (e as any).syncStatus })));
      console.log('[Frontend] All event titles:', backendEvents.map((e: CalendarEvent) => e.title));
      
      setEvents(backendEvents);
      
      // Update localStorage to match backend state
      const eventsToStore = backendEvents.map((event: CalendarEvent) => ({
        ...event,
        startTime: event.startTime.toISOString(),
        endTime: event.endTime.toISOString(),
      }));
      localStorage.setItem(calendarEventsLocalStorageKey, JSON.stringify(eventsToStore));
      
      return backendEvents;
    } catch (error) {
      console.error("Error loading events from backend:", error);
      throw error;
    }
  };

  // Function to load events from both localStorage and backend API (with fallback)
  const loadEventsFromStorage = async () => {
    console.log('[Frontend] 🔄 loadEventsFromStorage called');
    
    try {
      // Try to load from backend first (includes Google Calendar synced events)
      await loadEventsFromBackend();
      console.log('[Frontend] ✅ Backend events loaded successfully');
    } catch (error) {
      console.error("❌ Error loading events from backend, falling back to localStorage:", error);
      
      // Fallback to localStorage only
      try {
        const storedEventsString = localStorage.getItem(calendarEventsLocalStorageKey);
        if (storedEventsString) {
          console.log('[Frontend] 📦 Loading events from localStorage');
          const parsedEvents = JSON.parse(storedEventsString) as Array<Omit<CalendarEvent, 'startTime' | 'endTime'> & { startTime: string; endTime: string }>;
          const eventsWithDateObjects: CalendarEvent[] = parsedEvents.map((event: Omit<CalendarEvent, 'startTime' | 'endTime'> & { startTime: string; endTime: string }) => ({
            id: event.id,
            title: event.title || 'Untitled Event',
            startTime: new Date(event.startTime),
            endTime: new Date(event.endTime),
            color: event.color || 'bg-blue-500',
            description: event.description || '',
            location: event.location || '',
            attendees: event.attendees || [],
            organizer: event.organizer || 'Unknown',
          }));
          console.log('[Frontend] 📦 Loaded', eventsWithDateObjects.length, 'events from localStorage');
          setEvents(eventsWithDateObjects);
        } else {
          // No events anywhere, use initial events
          console.log('[Frontend] 🆕 No stored events found, using initial events');
          setEvents(getInitialEvents());
        }
      } catch (localError) {
        console.error("❌ Error handling calendar events from localStorage:", localError);
        console.log('[Frontend] 🆕 Fallback to initial events');
        setEvents(getInitialEvents());
      }
    }
  };

  // State declarations must come before useEffect hooks that use them
  const [events, setEvents] = useState<CalendarEvent[]>([]); // Initialize with empty array, will be populated by useEffect

  // Load events on component mount
  useEffect(() => {
    console.log('[Frontend] 🎯 Calendar component mounted, loading events...');
    loadEventsFromStorage();
  }, []); // Empty dependency array ensures this runs only once on mount

  // Debug useEffect to track events state changes
  useEffect(() => {
    console.log('[EVENTS DEBUG] 📊 Events state updated:', {
      totalEvents: events.length,
      eventTitles: events.map((e: CalendarEvent) => e.title),
      sampleEvent: events[0] ? {
        id: events[0].id,
        title: events[0].title,
        startTime: events[0].startTime,
        endTime: events[0].endTime,
        startTimeString: events[0].startTime.toISOString(),
        endTimeString: events[0].endTime.toISOString()
      } : 'NO EVENTS'
    });
  }, [events]);

  // Listen for storage changes from other tabs/components
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === calendarEventsLocalStorageKey) {
        loadEventsFromStorage();
      }
    };

    // Listen for storage events (cross-tab changes)
    window.addEventListener('storage', handleStorageChange);

    // Custom event for same-tab changes (since storage event doesn't fire in same tab)
    const handleCustomStorageChange = () => {
      loadEventsFromStorage();
    };
    window.addEventListener('calendarEventsUpdated', handleCustomStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('calendarEventsUpdated', handleCustomStorageChange);
    };
  }, []);

  const [currentView, setCurrentView] = useState("week")
  const [currentDisplayDate, setCurrentDisplayDate] = useState(new Date()) // Date object for current view
  const [selectedEventForDisplay, setSelectedEventForDisplay] = useState<CalendarEvent | null>(null); // Renamed from selectedEvent to avoid conflict
  const [eventToEdit, setEventToEdit] = useState<CalendarEvent | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);

  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null);
  const [dragOverDate, setDragOverDate] = useState<Date | null>(null);
  const [dragOverTimeSlot, setDragOverTimeSlot] = useState<number | null>(null); // To store the hour
  const [isDragOver, setIsDragOver] = useState(false); // To indicate if a drag is actively over a valid slot

  // State for resizing events - enhanced with preview state
  const [resizingEvent, setResizingEvent] = useState<{ 
    event: CalendarEvent; 
    handle: 'top' | 'bottom'; 
    initialY: number; 
    originalStartTime: Date; 
    originalEndTime: Date; 
  } | null>(null);
  
  // Preview state for drag/resize operations - prevents corruption of main state
  const [previewEvent, setPreviewEvent] = useState<CalendarEvent | null>(null);
  const [isDraggingEvent, setIsDraggingEvent] = useState(false);
  const [isResizingEvent, setIsResizingEvent] = useState(false);

  // Google Calendar sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{
    totalEvents: number;
    syncedEvents: number;
    pendingEvents: number;
    errorEvents: number;
    localOnlyEvents: number;
    lastSyncAt?: string;
  } | null>(null);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);

  // Function to generate initial events with current dates
  const getInitialEvents = (): CalendarEvent[] => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    return [
    {
      id: 1,
      title: "Team Meeting",
      startTime: new Date(currentYear, currentMonth, today.getDate(), 9, 0),
      endTime: new Date(currentYear, currentMonth, today.getDate(), 10, 0),
      color: "bg-blue-500",
      description: "Weekly team sync-up",
      location: "Conference Room A",
      attendees: ["John Doe", "Jane Smith", "Bob Johnson"],
      organizer: "Alice Brown",
    },
    {
      id: 100,
      title: "TEST TODAY EVENT",
      startTime: new Date(currentYear, currentMonth, today.getDate(), 14, 0),
      endTime: new Date(currentYear, currentMonth, today.getDate(), 15, 0),
      color: "bg-red-500",
      description: "Test event for today to verify visibility",
      location: "Test Location",
      attendees: ["Test User"],
      organizer: "System",
    },
    {
      id: 2,
      title: "Lunch with Sarah",
      startTime: new Date(currentYear, currentMonth, today.getDate() + 1, 12, 30),
      endTime: new Date(currentYear, currentMonth, today.getDate() + 1, 13, 30),
      color: "bg-green-500",
      description: "Discuss project timeline",
      location: "Cafe Nero",
      attendees: ["Sarah Lee"],
      organizer: "You",
    },
    {
      id: 3,
      title: "Project Review",
      startTime: new Date(currentYear, currentMonth, today.getDate() + 2, 14, 0),
      endTime: new Date(currentYear, currentMonth, today.getDate() + 2, 15, 30),
      color: "bg-purple-500",
      description: "Q2 project progress review",
      location: "Meeting Room 3",
      attendees: ["Team Alpha", "Stakeholders"],
      organizer: "Project Manager",
    },
    {
      id: 4,
      title: "Client Call",
      startTime: new Date(currentYear, currentMonth, today.getDate() + 1, 10, 0),
      endTime: new Date(currentYear, currentMonth, today.getDate() + 1, 11, 0),
      color: "bg-yellow-500",
      description: "Quarterly review with major client",
      location: "Zoom Meeting",
      attendees: ["Client Team", "Sales Team"],
      organizer: "Account Manager",
    },
    {
      id: 5,
      title: "Team Brainstorm",
      startTime: new Date(currentYear, currentMonth, today.getDate() + 3, 13, 0),
      endTime: new Date(currentYear, currentMonth, today.getDate() + 3, 14, 30),
      color: "bg-indigo-500",
      description: "Ideation session for new product features",
      location: "Creative Space",
      attendees: ["Product Team", "Design Team"],
      organizer: "Product Owner",
    },
    {
      id: 6,
      title: "Future Planning",
      startTime: new Date(currentYear, currentMonth, today.getDate() + 4, 11, 0),
      endTime: new Date(currentYear, currentMonth, today.getDate() + 4, 12, 0),
      color: "bg-pink-500",
      description: "Planning for Q3",
      location: "Strategy Room",
      attendees: ["Leadership"],
      organizer: "CEO",
    },
    {
      id: 9,
      title: "Morning Standup",
      startTime: new Date(currentYear, currentMonth, today.getDate() + 1, 8, 30),
      endTime: new Date(currentYear, currentMonth, today.getDate() + 1, 9, 30),
      color: "bg-blue-400",
      description: "Daily team standup",
      location: "Slack Huddle",
      attendees: ["Development Team"],
      organizer: "Scrum Master",
    },
    {
      id: 10,
      title: "Design Review",
      startTime: new Date(currentYear, currentMonth, today.getDate() + 5, 14, 30),
      endTime: new Date(currentYear, currentMonth, today.getDate() + 5, 15, 45),
      color: "bg-purple-400",
      description: "Review new UI designs",
      location: "Design Lab",
      attendees: ["UX Team", "Product Manager"],
      organizer: "Lead Designer",
    },
    {
      id: 11,
      title: "Investor Meeting",
      startTime: new Date(currentYear, currentMonth, today.getDate() + 5, 10, 30),
      endTime: new Date(currentYear, currentMonth, today.getDate() + 5, 12, 0),
      color: "bg-red-400",
      description: "Quarterly investor update",
      location: "Board Room",
      attendees: ["Executive Team", "Investors"],
      organizer: "CEO",
    },
    {
      id: 12,
      title: "Team Training",
      startTime: new Date(currentYear, currentMonth, today.getDate() + 2, 9, 30),
      endTime: new Date(currentYear, currentMonth, today.getDate() + 2, 11, 30),
      color: "bg-green-400",
      description: "New tool onboarding session",
      location: "Training Room",
      attendees: ["All Departments"],
      organizer: "HR",
    },
    {
      id: 13,
      title: "Budget Review",
      startTime: new Date(currentYear, currentMonth, today.getDate() + 2, 13, 30),
      endTime: new Date(currentYear, currentMonth, today.getDate() + 2, 15, 0),
      color: "bg-yellow-400",
      description: "Quarterly budget analysis",
      location: "Finance Office",
      attendees: ["Finance Team", "Department Heads"],
      organizer: "CFO",
    },
    {
      id: 14,
      title: "Client Presentation",
      startTime: new Date(currentYear, currentMonth, today.getDate() + 3, 11, 0),
      endTime: new Date(currentYear, currentMonth, today.getDate() + 3, 12, 30),
      color: "bg-orange-400",
      description: "Present new project proposal",
      location: "Client Office",
      attendees: ["Sales Team", "Client Representatives"],
      organizer: "Account Executive",
    },
    {
      id: 15,
      title: "Product Planning",
      startTime: new Date(currentYear, currentMonth, today.getDate() + 4, 14, 0),
      endTime: new Date(currentYear, currentMonth, today.getDate() + 4, 15, 30),
      color: "bg-pink-400",
      description: "Roadmap discussion for Q3",
      location: "Strategy Room",
      attendees: ["Product Team", "Engineering Leads"],
      organizer: "Product Manager",
    },
    ];
  };

  // useEffect to save events to localStorage whenever the events state changes
  const isInitialMount = useRef(true); // Ref to track initial mount

  useEffect(() => {
    // Don't save on initial mount if events are still empty,
    // allow the first useEffect to load from localStorage or set initialEvents first.
    if (isInitialMount.current) {
      if (events.length > 0) {
        // This means events were populated by the first useEffect
        isInitialMount.current = false;
      } else {
        // Events are still empty, probably before the first useEffect has run or found nothing
        // and hasn't set initialEvents yet.
        return;
      }
    }

    // If it's not the initial mount, or if events got populated, proceed to save.
    if (events.length === 0 && !isInitialMount.current) {
      // If events array is cleared after initial load, also clear localStorage
      try {
        localStorage.removeItem(calendarEventsLocalStorageKey);
      } catch (error) {
        console.error("Error removing calendar events from localStorage:", error);
      }
    } else if (events.length > 0) {
      try {
        const eventsToStore = events.map(event => ({
          ...event,
          startTime: event.startTime.toISOString(),
          endTime: event.endTime.toISOString(),
        }));
        localStorage.setItem(calendarEventsLocalStorageKey, JSON.stringify(eventsToStore));
      } catch (error) {
        console.error("Error saving calendar events to localStorage:", error);
      }
    }
  }, [events]); // Dependency array includes events

  // State for the Create/Edit Event Modal
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventStartDate, setNewEventStartDate] = useState("");
  const [newEventStartTime, setNewEventStartTime] = useState("");
  const [newEventEndDate, setNewEventEndDate] = useState("");
  const [newEventEndTime, setNewEventEndTime] = useState("");
  const [newEventDescription, setNewEventDescription] = useState("");
  const [newEventColor, setNewEventColor] = useState("bg-blue-500"); // Default color

  const handleEventClick = (event: CalendarEvent) => {
    // Validate event data before opening modal to prevent corruption
    console.log('[Frontend] handleEventClick called with event:', event);
    
    if (!event || !event.id || !event.title || !event.startTime || !event.endTime) {
      console.error('[Frontend] Invalid event data, refusing to open modal:', event);
      toast({
        title: "Error",
        description: "Cannot edit event: invalid event data detected.",
        variant: "destructive",
      });
      return;
    }

    // Prevent opening modal during drag/resize operations
    if (isDraggingEvent || isResizingEvent || draggedEvent || resizingEvent) {
      console.log('[Frontend] Ignoring event click during drag/resize operation');
      return;
    }

    try {
      setModalMode("edit");
      setEventToEdit(event);
      setNewEventTitle(event.title);
      setNewEventStartDate(format(event.startTime, "yyyy-MM-dd"));
      setNewEventStartTime(format(event.startTime, "HH:mm"));
      setNewEventEndDate(format(event.endTime, "yyyy-MM-dd"));
      setNewEventEndTime(format(event.endTime, "HH:mm"));
      setNewEventDescription(event.description || '');
      setNewEventColor(event.color || 'bg-blue-500');
      setIsEventModalOpen(true);
    } catch (error) {
      console.error('[Frontend] Error in handleEventClick:', error);
      toast({
        title: "Error",
        description: "Failed to open event editor.",
        variant: "destructive",
      });
    }
  };

  const openCreateModal = (date?: Date) => {
    const targetDate = date || currentDisplayDate; // Use provided date or current display date
    setModalMode("create");
    setEventToEdit(null);
    setNewEventTitle("");
    setNewEventStartDate(format(targetDate, "yyyy-MM-dd"));
    setNewEventStartTime("09:00"); // Default start time
    setNewEventEndDate(format(targetDate, "yyyy-MM-dd"));
    setNewEventEndTime("10:00");   // Default end time
    setNewEventDescription("");
    setNewEventColor(myCalendars[0]?.color || "bg-blue-500"); // Default to first calendar color
    setIsEventModalOpen(true);
  };

  const closeEventModal = () => {
    setIsEventModalOpen(false);
    setModalMode(null);
    setEventToEdit(null);
    // Clear preview states when closing modal
    setPreviewEvent(null);
    setIsResizingEvent(false);
    setIsDraggingEvent(false);
    // Optionally reset fields here if not reset on open for create mode
  };

  // Safe event filtering function to prevent corrupted events from being displayed
  const getSafeEvents = (eventsList: CalendarEvent[]): CalendarEvent[] => {
    // For now, just return all events - we've fixed the data loading to ensure all fields exist
    return eventsList;
  };

  const handleSubmitEvent = async () => {
    console.log('[Frontend] handleSubmitEvent called');
    console.log('[Frontend] modalMode:', modalMode);
    console.log('[Frontend] eventToEdit:', eventToEdit);
    
    if (!newEventTitle || !newEventStartDate || !newEventStartTime || !newEventEndDate || !newEventEndTime) {
      console.log('[Frontend] Missing required fields:', {
        title: newEventTitle,
        startDate: newEventStartDate,
        startTime: newEventStartTime,
        endDate: newEventEndDate,
        endTime: newEventEndTime
      });
      alert("Please fill in all required fields: Title, Start Date/Time, End Date/Time.");
      return;
    }

    const startDateTime = new Date(`${newEventStartDate}T${newEventStartTime}`);
    const endDateTime = new Date(`${newEventEndDate}T${newEventEndTime}`);

    if (endDateTime <= startDateTime) {
      alert("End time must be after start time.");
      return;
    }

    try {
      if (modalMode === "create") {
        console.log('[Frontend] Creating new event...');
        
        // Create new event in backend
        const eventData = {
          title: newEventTitle,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          description: newEventDescription,
          color: newEventColor,
          location: '',
          attendees: [],
          organizer: 'You',
        };

        console.log('[Frontend] Sending event data to backend:', eventData);
        
        const response = await axiosInstance.post('/calendar-events', eventData);
        
        console.log('[Frontend] Backend response:', response.data);
        
        const backendEvent = {
          id: response.data._id || response.data.id,
          title: response.data.title,
          startTime: new Date(response.data.startTime),
          endTime: new Date(response.data.endTime),
          color: response.data.color || 'bg-blue-500',
          description: response.data.description || '',
          location: response.data.location || '',
          attendees: response.data.attendees || [],
          organizer: response.data.organizer || 'You',
        };

        console.log('[Frontend] Processed backend event:', backendEvent);
        console.log('[Frontend] Current events before adding:', events.length);

        setEvents(prevEvents => {
          const newEventsArray = [...prevEvents, backendEvent];
          console.log('[Frontend] Updated events array:', newEventsArray.length, 'total events');
          console.log('[Frontend] New event added:', backendEvent.title);
          return newEventsArray;
        });

        // Force reload events from backend to ensure UI sync
        setTimeout(() => {
          loadEventsFromBackend().catch(console.error);
        }, 500);
        
        toast({
          title: "Event Created",
          description: `"${newEventTitle}" has been added to your calendar.`,
        });
      } else if (modalMode === "edit" && eventToEdit) {
        console.log('[Frontend] Edit mode - eventToEdit:', eventToEdit);
        
        // Check if this is a local event (timestamp ID) or backend event (MongoDB ObjectId)
        const isBackendEvent = typeof eventToEdit.id === 'string' && eventToEdit.id.length === 24;
        const isLocalEvent = typeof eventToEdit.id === 'number' || (typeof eventToEdit.id === 'string' && eventToEdit.id.length !== 24);
        
        console.log('[Frontend] Event type detection:', {
          eventId: eventToEdit.id,
          eventIdType: typeof eventToEdit.id,
          eventIdLength: typeof eventToEdit.id === 'string' ? eventToEdit.id.length : 'N/A',
          isBackendEvent,
          isLocalEvent
        });
        
        const eventData = {
          title: newEventTitle,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          description: newEventDescription,
          color: newEventColor,
          location: eventToEdit.location || '',
          attendees: eventToEdit.attendees || [],
          organizer: eventToEdit.organizer || 'You',
        };

        let updatedEvent;
        
        if (isBackendEvent) {
          // Update existing backend event
          console.log('[Frontend] Updating backend event with ID:', eventToEdit.id);
          const response = await axiosInstance.put(`/calendar-events/${eventToEdit.id}`, eventData);
          updatedEvent = {
            ...response.data,
            startTime: new Date(response.data.startTime),
            endTime: new Date(response.data.endTime),
          };
        } else if (isLocalEvent) {
          // Convert local event to backend event by creating it first
          console.log('[Frontend] Converting local event to backend event, local ID:', eventToEdit.id);
          const response = await axiosInstance.post('/calendar-events', eventData);
          updatedEvent = {
            ...response.data,
            startTime: new Date(response.data.startTime),
            endTime: new Date(response.data.endTime),
          };
          
          // Remove the old local event from state
          setEvents(prevEvents => prevEvents.filter(e => e.id !== eventToEdit.id));
        } else {
          throw new Error('Unable to determine event type for update');
        }

        // Add or update the event in state
        if (isBackendEvent) {
          setEvents(prevEvents => 
            prevEvents.map(e => (e.id === eventToEdit.id ? updatedEvent : e))
          );
        } else {
          setEvents(prevEvents => [...prevEvents, updatedEvent]);
        }

        // Force reload events from backend to ensure UI sync
        setTimeout(() => {
          loadEventsFromBackend().catch(console.error);
        }, 500);

        toast({
          title: "Event Updated",
          description: `"${newEventTitle}" has been updated.`,
        });
      } else if (modalMode === "edit" && !eventToEdit) {
        console.error('[Frontend] Edit mode but eventToEdit is null');
        toast({
          title: "Error",
          description: "Cannot update event: event data is missing.",
          variant: "destructive",
        });
        return;
      } else {
        console.error('[Frontend] Unknown modal mode:', modalMode);
        toast({
          title: "Error",
          description: "Unknown operation mode.",
          variant: "destructive",
        });
        return;
      }
    } catch (error: any) {
      console.error('[Frontend] Error saving event:', error);
      console.error('[Frontend] Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      toast({
        title: "Error",
        description: error.response?.data?.message || error.message || "Failed to save event.",
        variant: "destructive",
      });
      return;
    }

    closeEventModal();
  };

  // Delete event function
  const handleDeleteEvent = async (eventToDelete: CalendarEvent) => {
    try {
      // Check if this is a Google Calendar synced event
      const hasGoogleEventId = (eventToDelete as any).googleEventId;
      const isGoogleCalendarEvent = eventToDelete.color === 'bg-emerald-600' || hasGoogleEventId;
      
      // Delete from backend if it's a backend event (MongoDB ObjectId format)
      const isBackendEvent = typeof eventToDelete.id === 'string' && eventToDelete.id.length === 24;
      
      if (isBackendEvent) {
        console.log('[Frontend] Deleting backend event with ID:', eventToDelete.id);
        console.log('[Frontend] Is Google Calendar event:', isGoogleCalendarEvent);
        console.log('[Frontend] Google Event ID:', hasGoogleEventId);
        
        // For Google Calendar events, we need to handle deletion carefully
        if (isGoogleCalendarEvent && hasGoogleEventId) {
          // Show confirmation for Google Calendar events
          const confirmDelete = window.confirm(
            `"${eventToDelete.title}" is synced with Google Calendar.\n\n` +
            `Delete options:\n` +
            `• OK: Delete from both Synapse and Google Calendar\n` +
            `• Cancel: Keep event unchanged\n\n` +
            `Choose OK to delete from both calendars.`
          );
          
          if (!confirmDelete) {
            return; // User cancelled deletion
          }
          
          // Check if Google is connected before attempting sync delete
          const currentToken = googleAuthService.getAccessToken();
          const connectionStatus = googleAuthService.getConnectionStatus();
          
          if (currentToken && connectionStatus.connected) {
            try {
              // First, delete from Synapse backend (this will handle Google Calendar deletion via backend)
              await axiosInstance.delete(`/calendar-events/${eventToDelete.id}`);
              
              toast({
                title: "Google Calendar Event Deleted",
                description: `"${eventToDelete.title}" has been deleted from both Synapse and Google Calendar.`,
                variant: "default"
              });
            } catch (error: any) {
              console.error('[Frontend] Error deleting Google Calendar event:', error);
              
              // If backend delete fails, still remove from local state but warn user
              toast({
                title: "Partial Deletion",
                description: `Event removed from Synapse, but may still exist in Google Calendar. Try syncing to resolve.`,
                variant: "destructive"
              });
            }
          } else {
            // No Google connection - delete from Synapse only and warn user
            await axiosInstance.delete(`/calendar-events/${eventToDelete.id}`);
            
            toast({
              title: "Google Calendar Disconnected",
              description: `"${eventToDelete.title}" deleted from Synapse only. Connect Google Calendar and sync to complete deletion.`,
              variant: "destructive"
            });
          }
        } else {
          // Regular Synapse-only event
          await axiosInstance.delete(`/calendar-events/${eventToDelete.id}`);
          
          toast({
            title: "Event Deleted",
            description: `"${eventToDelete.title}" has been removed from your calendar.`,
            variant: "default"
          });
        }
      } else {
        console.log('[Frontend] Deleting local event with ID:', eventToDelete.id);
        // Local events don't need backend deletion
        toast({
          title: "Local Event Deleted",
          description: `"${eventToDelete.title}" has been removed from your calendar.`,
          variant: "default"
        });
      }

      // Update React state
      const updatedEvents = events.filter(event => event.id !== eventToDelete.id);
      setEvents(updatedEvents);
      
      // Update localStorage
      const eventsToStore = updatedEvents.map(event => ({
        ...event,
        startTime: event.startTime.toISOString(),
        endTime: event.endTime.toISOString(),
      }));
      localStorage.setItem(calendarEventsLocalStorageKey, JSON.stringify(eventsToStore));
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('calendarEventsUpdated'));
      
    } catch (error: any) {
      console.error('Error deleting event:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete event.",
        variant: "destructive",
      });
    }
  };

  // Safe event update function that prevents data corruption
  const updateEventSafely = async (eventToUpdate: CalendarEvent, newStartTime: Date, newEndTime: Date) => {
    console.log('[Frontend] updateEventSafely called', {
      eventId: eventToUpdate.id,
      eventTitle: eventToUpdate.title,
      newStartTime: newStartTime.toString(),
      newEndTime: newEndTime.toString()
    });

    // Validate inputs to prevent corruption
    if (!eventToUpdate || !eventToUpdate.id || !eventToUpdate.title) {
      console.error('[Frontend] Invalid event data passed to updateEventSafely:', eventToUpdate);
      toast({
        title: "Error",
        description: "Invalid event data. Cannot update event.",
        variant: "destructive",
      });
      return false;
    }

    if (!newStartTime || !newEndTime || isNaN(newStartTime.getTime()) || isNaN(newEndTime.getTime())) {
      console.error('[Frontend] Invalid date data passed to updateEventSafely:', { newStartTime, newEndTime });
      toast({
        title: "Error", 
        description: "Invalid date data. Cannot update event.",
        variant: "destructive",
      });
      return false;
    }

    // Check if this is a Google Calendar synced event
    const hasGoogleEventId = (eventToUpdate as any).googleEventId;
    const isGoogleCalendarEvent = eventToUpdate.color === 'bg-emerald-600' || hasGoogleEventId;

    // Ensure minimum 15-minute duration
    const minDuration = 15 * 60 * 1000; // 15 minutes in milliseconds
    let finalStartTime = new Date(newStartTime);
    let finalEndTime = new Date(newEndTime);
    
    const duration = finalEndTime.getTime() - finalStartTime.getTime();
    
    if (duration < minDuration) {
      // Adjust to maintain minimum duration
      if (resizingEvent?.handle === 'top') {
        finalStartTime = new Date(finalEndTime.getTime() - minDuration);
      } else {
        finalEndTime = new Date(finalStartTime.getTime() + minDuration);
      }
    }

    try {
      // Create the updated event with validation
      const updatedEvent = {
        ...eventToUpdate,
        startTime: finalStartTime,
        endTime: finalEndTime,
        title: eventToUpdate.title, // Explicitly preserve title
        description: eventToUpdate.description || '', // Preserve description
        color: eventToUpdate.color || 'bg-blue-500' // Preserve color
      };

      // Check if this event has a MongoDB ObjectId (backend event)
      const isBackendEvent = typeof eventToUpdate.id === 'string' && eventToUpdate.id.length === 24;
      
      if (isBackendEvent) {
        try {
          const payload = {
            title: updatedEvent.title,
            startTime: finalStartTime.toISOString(),
            endTime: finalEndTime.toISOString(),
            description: updatedEvent.description,
            color: updatedEvent.color,
            location: updatedEvent.location || '',
            attendees: updatedEvent.attendees || [],
            organizer: updatedEvent.organizer || 'You',
          };

          console.log('[Frontend] Updating backend event...');
          if (isGoogleCalendarEvent) {
            console.log('[Frontend] Event is synced with Google Calendar, backend will handle Google sync');
          }

          const response = await axiosInstance.put(`/calendar-events/${eventToUpdate.id}`, payload);
          console.log('[Frontend] ✅ Backend update successful for drag/drop:', response.data);
          
          // Update the local event with any data returned from backend
          const backendEvent = response.data;
          updatedEvent.id = backendEvent._id || backendEvent.id;
          updatedEvent.startTime = new Date(backendEvent.startTime);
          updatedEvent.endTime = new Date(backendEvent.endTime);
          
          // Show different messages for Google Calendar events
          if (isGoogleCalendarEvent && hasGoogleEventId) {
            const currentToken = googleAuthService.getAccessToken();
            const connectionStatus = googleAuthService.getConnectionStatus();
            
            if (currentToken && connectionStatus.connected) {
              toast({
                title: "Google Calendar Event Updated",
                description: `"${eventToUpdate.title}" updated in both Synapse and Google Calendar.`,
              });
            } else {
              toast({
                title: "Event Updated (Synapse Only)",
                description: `"${eventToUpdate.title}" updated in Synapse. Connect Google to sync changes.`,
                variant: "destructive"
              });
            }
          } else {
            toast({
              title: "Event Updated",
              description: `"${eventToUpdate.title}" has been updated and synced.`,
            });
          }
          
        } catch (backendError: any) {
          console.error('[Frontend] ❌ Backend update failed for drag/drop:', backendError);
          
          if (backendError?.response?.status === 401) {
            toast({
              title: "Authentication Error",
              description: "Please log in to save changes. Changes saved locally only.",
              variant: "destructive"
            });
          } else {
            const errorMessage = backendError?.response?.data?.message || backendError?.message || 'Backend error';
            toast({
              title: "Sync Warning",
              description: `Could not sync to server: ${errorMessage}. Changes saved locally.`,
              variant: "destructive"
            });
          }
          // Continue with local update even if backend fails
        }
      } else {
        console.log('[Frontend] Event appears to be localStorage-only, skipping backend update');
        toast({
          title: "Local Event Updated",
          description: `"${eventToUpdate.title}" has been updated locally.`,
        });
      }

      // Update the events array safely
      const updatedEvents = events.map(event => {
        if (event.id === eventToUpdate.id) {
          console.log('[Frontend] Updating event:', event.title, '->', updatedEvent.title);
          return updatedEvent;
        }
        return event;
      });
      
      // Verify the update worked correctly
      const targetEvent = updatedEvents.find(e => e.id === eventToUpdate.id);
      if (!targetEvent || targetEvent.title !== eventToUpdate.title) {
        console.error('[Frontend] Event update verification failed', {
          originalTitle: eventToUpdate.title,
          updatedTitle: targetEvent?.title
        });
        return false;
      }

      // Update React state
      setEvents(updatedEvents);
      
      // Update localStorage with proper date serialization
      const eventsForStorage = updatedEvents.map(event => ({
        ...event,
        startTime: event.startTime.toISOString(),
        endTime: event.endTime.toISOString()
      }));
      localStorage.setItem(calendarEventsLocalStorageKey, JSON.stringify(eventsForStorage));
      
      // Dispatch custom event for cross-component synchronization
      window.dispatchEvent(new CustomEvent('calendarEventsUpdated'));

      return true;
    } catch (error) {
      console.error('[Frontend] Error in updateEventSafely:', error);
      toast({
        title: "Error",
        description: "Failed to update event. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  const handleResizeEnd = async (resizedEvent: CalendarEvent, newStartTime: Date, newEndTime: Date) => {
    console.log('[Frontend] handleResizeEnd called', {
      eventId: resizedEvent.id,
      title: resizedEvent.title
    });
    
    const success = await updateEventSafely(resizedEvent, newStartTime, newEndTime);
    
    // Clear preview and resize states
    setPreviewEvent(null);
    setIsResizingEvent(false);
    setResizingEvent(null);
    
    return success;
  };

  // Sample calendar days for the week view
  const weekDays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]
  // These dates would need to be dynamically generated based on the current date/month
  const weekDates = eachDayOfInterval({
    start: startOfWeek(currentDisplayDate, { weekStartsOn: 0 }), // Sunday as start of week
    end: endOfWeek(currentDisplayDate, { weekStartsOn: 0 }),
  })
  const timeSlots = Array.from({ length: 13 }, (_, i) => i + 7) // 7 AM to 7 PM (inclusive)
  
  // Helper function to ensure consistent positioning across drag/drop and visual rendering
  const getGridPositionForHour = (hour: number): number => {
    const gridStartHour = 7;
    return (hour - gridStartHour) * 80; // 80px per hour slot
  }
  
  const getHourFromGridPosition = (position: number): number => {
    const gridStartHour = 7;
    return Math.round(position / 80) + gridStartHour;
  }

  // Helper function to calculate event position and height
  const calculateEventStyle = (startTime: Date, endTime: Date, isDragging: boolean = false) => {
    const startHour = startTime.getHours();
    const startMinute = startTime.getMinutes();
    const endHour = endTime.getHours();
    const endMinute = endTime.getMinutes();

    const start = startHour + startMinute / 60;
    const end = endHour + endMinute / 60;
    
    // Check if this is an all-day event (starts at 00:00 and ends at 23:59 or spans full day)
    const isAllDayEvent = (start === 0 && end >= 23) || (endTime.getTime() - startTime.getTime() >= 23 * 60 * 60 * 1000);
    
    if (isAllDayEvent) {
      // Show all-day events at the top as a banner
      return {
        top: `0px`,
        height: `30px`,
        opacity: isDragging ? 0.5 : 1,
        cursor: isDragging ? 'grabbing' : 'pointer',
        zIndex: isDragging ? 1000 : 15,
        borderRadius: '6px',
        fontSize: '11px',
        display: 'flex',
        alignItems: 'center',
        marginBottom: '2px'
      };
    }
    
    // For regular timed events - clamp to visible grid hours (7-19)
    const gridStartHour = 7; // Grid starts at 7 AM
    const gridEndHour = 19; // Grid ends at 7 PM
    const clampedStart = Math.max(gridStartHour, Math.min(gridEndHour, start));
    const clampedEnd = Math.max(gridStartHour, Math.min(gridEndHour + 1, end)); // Allow end to be 8 PM (20:00)
    
    // Calculate position relative to grid start (7 AM = position 0)
    const adjustedTop = getGridPositionForHour(clampedStart);
    const adjustedHeight = Math.max(20, (clampedEnd - clampedStart) * 80);
    
    // Debug logging for positioning (only when dragging to reduce noise)
    if (isDragging) {
      console.log('[DEBUG] Event positioning during drag:', {
        eventStartHour: startTime.getHours(),
        eventEndHour: endTime.getHours(),
        startMinutes: startTime.getMinutes(),
        endMinutes: endTime.getMinutes(),
        clampedStart,
        clampedEnd,
        gridStartHour,
        adjustedTop,
        adjustedHeight,
        isDragging,
        rawStart: start,
        rawEnd: end,
        timeSlotForStart: Math.floor(clampedStart), // Which time slot this event should appear in
        expectedSlotIndex: Math.floor(clampedStart) - 7  // Index in timeSlots array
      });
    }
    
    return {
      top: `${adjustedTop}px`,
      height: `${adjustedHeight}px`,
      opacity: isDragging ? 0.5 : 1,
      cursor: isDragging ? 'grabbing' : 'pointer',
      zIndex: isDragging ? 1000 : 10,
    };
  }

  // Sample calendar for mini calendar
  // This needs to be dynamic based on the current month and year
  const daysInMonth = 31 
  const firstDayOffset = 5 // Friday is the first day of the month in this example - NEEDS TO BE DYNAMIC
  const miniCalendarDays = Array.from({ length: daysInMonth + firstDayOffset }, (_, i) =>
    i < firstDayOffset ? null : i - firstDayOffset + 1,
  )

  // Sample my calendars
  const myCalendars = [
    { name: "My Calendar", color: "bg-blue-500" },
    { name: "Work", color: "bg-green-500" },
    { name: "Personal", color: "bg-purple-500" },
    { name: "Family", color: "bg-orange-500" },
  ]

  const togglePlay = () => {
    // setIsPlaying(!isPlaying)
    // Here you would typically also control the actual audio playback
    console.log("Playing audio");
  }

  const handleTodayClick = () => {
    setCurrentDisplayDate(new Date());
  }

  const handlePrevClick = () => {
    if (currentView === "day") {
      setCurrentDisplayDate(prev => subDays(prev, 1));
    } else if (currentView === "week") {
      setCurrentDisplayDate(prev => subWeeks(prev, 1));
    } else if (currentView === "month") {
      setCurrentDisplayDate(prev => subMonths(prev, 1));
    }
  }

  const handleNextClick = () => {
    if (currentView === "day") {
      setCurrentDisplayDate(prev => addDays(prev, 1));
    } else if (currentView === "week") {
      setCurrentDisplayDate(prev => addWeeks(prev, 1));
    } else if (currentView === "month") {
      setCurrentDisplayDate(prev => addMonths(prev, 1));
    }
  }

  const formatHeaderDate = () => {
    if (currentView === "day") {
      return format(currentDisplayDate, "MMMM d, yyyy");
    } else if (currentView === "week") {
      const start = startOfWeek(currentDisplayDate, { weekStartsOn: 0 });
      const end = endOfWeek(currentDisplayDate, { weekStartsOn: 0 });
      if (isSameMonth(start, end)) {
        return `${format(start, "MMM d")} - ${format(end, "d, yyyy")}`;
      }
      return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
    } else if (currentView === "month") {
      return format(currentDisplayDate, "MMMM yyyy");
    }
    return format(currentDisplayDate, "MMMM d, yyyy"); // Default
  }

  // Google Calendar sync functions
  const fetchSyncStatus = async () => {
    try {
      const status = await googleCalendarService.getSyncStatus();
      setSyncStatus(status);
    } catch (error) {
      console.error('Error fetching sync status:', error);
    }
  };

  const handleGoogleLogin = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/calendar.events',
    onSuccess: (tokenResponse) => {
      console.log('[GoogleAuth] Login successful, saving auth state');
      
      // Save to persistent storage
      googleAuthService.saveAuthState(tokenResponse);
      
      // Update component state
      setGoogleAccessToken(tokenResponse.access_token);
      setIsGoogleConnected(true);
      
      const connectionStatus = googleAuthService.getConnectionStatus();
      toast({
        title: "Google Calendar Connected",
        description: `Connected successfully! ${connectionStatus.timeLeft ? `Expires in ${Math.floor(connectionStatus.timeLeft / 60)} hours.` : ''}`,
      });
    },
    onError: (error) => {
      console.error('Google login error:', error);
      setIsGoogleConnected(false);
      toast({
        title: "Connection Failed",
        description: "Failed to connect to Google Calendar. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSyncWithGoogle = async () => {
    console.log('[Frontend] Starting comprehensive Google Calendar sync...');
    
    // Get current token (may be from localStorage)
    const currentToken = googleAuthService.getAccessToken();
    const connectionStatus = googleAuthService.getConnectionStatus();
    
    console.log('[Frontend] Connection status:', connectionStatus);
    console.log('[Frontend] Access token present:', !!currentToken);
    console.log('[Frontend] Access token length:', currentToken?.length || 0);

    if (!currentToken || !connectionStatus.connected) {
      console.log('[Frontend] No valid access token, triggering Google login...');
      
      // Clear expired state if exists
      if (!connectionStatus.connected) {
        googleAuthService.clearAuthState();
        setIsGoogleConnected(false);
        setGoogleAccessToken(null);
      }
      
      toast({
        title: "Google Calendar Connection Required",
        description: "Please connect to Google Calendar to enable bidirectional sync.",
        variant: "default"
      });
      
      handleGoogleLogin();
      return;
    }

    // Update local state if we got token from storage
    if (currentToken !== googleAccessToken) {
      setGoogleAccessToken(currentToken);
      setIsGoogleConnected(true);
    }

    setIsSyncing(true);
    
    try {
      console.log('[Frontend] Starting bidirectional sync process...');
      
      // Show initial sync status
      toast({
        title: "Google Calendar Sync Started",
        description: "Syncing events in both directions between Synapse and Google Calendar...",
        variant: "default"
      });

      const result = await googleCalendarService.syncWithGoogle(currentToken);
      
      console.log('[Frontend] Sync API response:', result);
      console.log('[Frontend] Events imported from Google:', result.eventsImported);
      console.log('[Frontend] Events exported to Google:', result.eventsExported);
      console.log('[Frontend] Sync errors:', result.errors);

      // Provide detailed feedback based on results
      if (result.success) {
        const totalEvents = result.eventsImported + result.eventsExported;
        
        if (totalEvents === 0) {
          toast({
            title: "Sync Complete - No Changes",
            description: "All events are already in sync between Synapse and Google Calendar.",
            variant: "default"
          });
        } else {
          let description = [];
          if (result.eventsImported > 0) {
            description.push(`Imported ${result.eventsImported} events from Google Calendar`);
          }
          if (result.eventsExported > 0) {
            description.push(`Exported ${result.eventsExported} events to Google Calendar`);
          }
          
          toast({
            title: "Bidirectional Sync Complete ✅",
            description: description.join('. ') + '.',
            variant: "default"
          });
        }
      } else {
        toast({
          title: "Sync Completed with Issues",
          description: `Partial sync completed. ${result.errors.length} errors occurred.`,
          variant: "destructive"
        });
      }

      // Handle any errors that occurred
      if (result.errors.length > 0) {
        console.warn('[Frontend] Sync completed with errors:', result.errors);
        
        // Show detailed error information for debugging
        const errorSummary = result.errors.slice(0, 3).join('; ');
        toast({
          title: "Sync Warnings",
          description: `Some events had issues: ${errorSummary}${result.errors.length > 3 ? '...' : ''}`,
          variant: "destructive"
        });
      }

      // Refresh events and sync status
      console.log('[Frontend] Refreshing events from backend...');
      try {
        const refreshedEvents = await loadEventsFromBackend(); // Force reload from backend to get new Google Calendar events
        console.log('[Frontend] Refreshed events count:', refreshedEvents.length);
        
        const googleEvents = refreshedEvents.filter((e: CalendarEvent) => e.color === 'bg-emerald-600');
        const synapseEvents = refreshedEvents.filter((e: CalendarEvent) => e.color !== 'bg-emerald-600');
        
        console.log('[Frontend] Google Calendar events (emerald):', googleEvents.length);
        console.log('[Frontend] Synapse events (other colors):', synapseEvents.length);
        
        await fetchSyncStatus();
        console.log('[Frontend] Events and sync status refreshed successfully');
        
        // Show final success message with details
        toast({
          title: "Calendar Refreshed",
          description: `Displaying ${refreshedEvents.length} total events (${googleEvents.length} from Google, ${synapseEvents.length} from Synapse).`,
          variant: "default"
        });
      } catch (refreshError) {
        console.error('[Frontend] Error refreshing events:', refreshError);
        toast({
          title: "Refresh Warning", 
          description: "Sync completed but couldn't refresh display. Please reload the page to see changes.",
          variant: "destructive"
        });
        // Still try fallback method
        await loadEventsFromStorage();
      }
    } catch (error: any) {
      console.error('[Frontend] Sync error:', error);
      console.error('[Frontend] Error response:', error.response?.data);
      
      let errorMessage = "Failed to sync with Google Calendar.";
      if (error.response?.status === 401) {
        errorMessage = "Authentication expired. Please reconnect to Google Calendar.";
        // Clear auth state
        googleAuthService.clearAuthState();
        setIsGoogleConnected(false);
        setGoogleAccessToken(null);
      } else if (error.response?.status === 403) {
        errorMessage = "Permission denied. Please check Google Calendar access permissions.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      toast({
        title: "Sync Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const getSyncStatusIcon = () => {
    if (!syncStatus) return <RefreshCw className="h-4 w-4" />;
    
    if (syncStatus.errorEvents > 0) {
      return <AlertCircle className="h-4 w-4 text-red-400" />;
    }
    
    if (syncStatus.syncedEvents === syncStatus.totalEvents && syncStatus.totalEvents > 0) {
      return <CheckCircle className="h-4 w-4 text-green-400" />;
    }
    
    return <RefreshCw className="h-4 w-4 text-blue-400" />;
  };

  const getSyncStatusText = () => {
    if (!syncStatus) return "Sync with Google";
    
    if (syncStatus.totalEvents === 0) return "No events to sync";
    
    return `${syncStatus.syncedEvents}/${syncStatus.totalEvents} synced`;
  };

  // Debug function to create a test local event
  const createTestLocalEvent = async () => {
    try {
      // Create a test event during normal business hours today
      const now = new Date();
      const testStartTime = new Date(now);
      testStartTime.setHours(14, 0, 0, 0); // 2 PM today
      const testEndTime = new Date(now);
      testEndTime.setHours(15, 0, 0, 0); // 3 PM today

      const testEvent = {
        title: `Test Event ${now.getTime()}`,
        startTime: testStartTime.toISOString(),
        endTime: testEndTime.toISOString(),
        description: 'This is a test event created to verify calendar display',
        color: 'bg-red-500',
      };

      console.log('[Debug] Creating test local event...');
      console.log('[Debug] Event details:', {
        title: testEvent.title,
        startTime: testStartTime.toString(),
        endTime: testEndTime.toString(),
        startHour: testStartTime.getHours(),
        endHour: testEndTime.getHours()
      });
      
      const response = await axiosInstance.post('/calendar-events', testEvent);
      console.log('[Debug] Test event created:', response.data);
      
      await loadEventsFromBackend();
      
      toast({
        title: "Test Event Created",
        description: `Created test event at 2-3 PM today. Check if it appears in the calendar.`,
        variant: "default",
      });
    } catch (error: any) {
      console.error('[Debug] Error creating test event:', error);
      toast({
        title: "Test Event Failed",
        description: error.response?.data?.message || "Failed to create test event.",
        variant: "destructive",
      });
    }
  };

  // Initialize Google auth state on component mount
  useEffect(() => {
    // Check for existing Google auth state
    const savedToken = googleAuthService.getAccessToken();
    const connectionStatus = googleAuthService.getConnectionStatus();
    
    if (savedToken && connectionStatus.connected) {
      console.log('[GoogleAuth] Restored connection from localStorage');
      setGoogleAccessToken(savedToken);
      setIsGoogleConnected(true);
      
      if (connectionStatus.timeLeft && connectionStatus.timeLeft < 30) {
        toast({
          title: "Google Calendar Token Expiring",
          description: `Your Google Calendar connection expires in ${connectionStatus.timeLeft} minutes.`,
          variant: "default",
        });
      }
    } else {
      console.log('[GoogleAuth] No valid stored connection found');
      setIsGoogleConnected(false);
    }
    
    fetchSyncStatus();
  }, []);

  // Check token expiration periodically
  useEffect(() => {
    if (!isGoogleConnected) return;

    const checkTokenExpiration = () => {
      const connectionStatus = googleAuthService.getConnectionStatus();
      if (!connectionStatus.connected) {
        console.log('[GoogleAuth] Token expired, clearing connection');
        setIsGoogleConnected(false);
        setGoogleAccessToken(null);
        toast({
          title: "Google Calendar Disconnected",
          description: "Your session has expired. Please reconnect to continue syncing.",
          variant: "default",
        });
      }
    };

    // Check every 5 minutes
    const interval = setInterval(checkTokenExpiration, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isGoogleConnected]);

  return (
    <div className="relative min-h-screen w-full overflow-hidden"> {/* Removed temp bg-red-500 */}
      {/* Background Image - Restored */}
      <img
        src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2070&auto=format&fit=crop"
        alt="Beautiful mountain landscape"
        className="object-cover absolute inset-0 w-full h-full -z-10"
      />

      {/* Navigation - Restored */}
      <header
        className={`absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-8 py-6 ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500 ease-out`}
      >
        <div className="flex items-center gap-4">
          <Menu className="h-6 w-6 text-white" />
          <span className="text-2xl font-semibold text-white drop-shadow-lg">Calendar</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/70" />
            <input
              type="text"
              placeholder="Search"
              className="rounded-full bg-white/10 backdrop-blur-sm pl-10 pr-4 py-2 text-white placeholder:text-white/70 border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/30"
            />
          </div>
          <Settings className="h-6 w-6 text-white drop-shadow-md" />
          <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold shadow-md">
            U
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative h-screen w-full pt-20 flex z-0"> {/* Added z-0 to main */}
        {/* Sidebar - Restored */}
        <div
          className={`w-64 h-full bg-white/10 backdrop-blur-lg p-4 shadow-xl border-r border-white/20 rounded-tr-3xl ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500 ease-out delay-200 flex flex-col justify-between`}
        >
          <div>
            <button 
              onClick={() => openCreateModal()} 
              className="mb-6 flex items-center justify-center gap-2 rounded-full bg-blue-500 px-4 py-3 text-white w-full"
            >
              <Plus className="h-5 w-5" />
              <span>Create</span>
            </button>
            {/* Mini Calendar & My Calendars sections - Restored and made dynamic */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-white">{format(currentDisplayDate, "MMMM yyyy")}</h3>
                {/* Mini calendar navigation - can be added later if needed */}
                {/* <div className="flex"> 
                  <button onClick={() => setCurrentDisplayDate(prev => subMonths(prev, 1))} className="p-1 text-white/70 hover:text-white rounded-l-md"><ChevronLeft className="h-4 w-4" /></button>
                  <button onClick={() => setCurrentDisplayDate(prev => addMonths(prev, 1))} className="p-1 text-white/70 hover:text-white rounded-r-md"><ChevronRight className="h-4 w-4" /></button>
                </div> */}
              </div>
              <div className="grid grid-cols-7 gap-px text-center text-xs text-white">
                {weekDays.map((day) => (
                  <div key={day} className="pb-1 text-white/60">{day.charAt(0)}</div> // Just the first letter
                ))}
                {(() => {
                  const miniMonthStart = startOfMonth(currentDisplayDate);
                  const miniStartDate = startOfWeek(miniMonthStart, { weekStartsOn: 0 });
                  const miniMonthEnd = endOfMonth(currentDisplayDate);
                  const miniEndDate = endOfWeek(miniMonthEnd, { weekStartsOn: 0 });
                  const daysForMiniCalendar = eachDayOfInterval({ start: miniStartDate, end: miniEndDate });

                  return daysForMiniCalendar.map((day, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setCurrentDisplayDate(day);
                        // Optional: switch to day view when a date is clicked in mini calendar
                        // setCurrentView('day'); 
                      }}
                      className={`py-1 rounded-full transition-colors duration-150 ease-in-out
                        ${!isSameMonth(day, currentDisplayDate) ? 'text-white/30 hover:bg-white/10' : 'text-white hover:bg-white/20'}
                        ${isToday(day) ? 'ring-1 ring-blue-400 font-semibold' : ''}
                        ${isSameDay(day, currentDisplayDate) ? 'bg-blue-500 text-white font-bold' : ''}
                      `}
                    >
                      {format(day, "d")}
                    </button>
                  ));
                })()}
              </div>
            </div>
            
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-white mb-2">My Calendars</h3>
              <div className="space-y-2">
                {myCalendars.map((calendar, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-white/80">
                    <span className={`h-3 w-3 rounded-sm ${calendar.color}`}></span>
                    <span>{calendar.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <button 
            onClick={() => openCreateModal()} 
            className="mt-6 flex items-center justify-center gap-2 rounded-full bg-blue-500 p-4 text-white w-14 h-14 self-start"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>

        {/* Calendar View - Added z-index for testing, restored animation classes */}
        <div
          className={`flex-1 flex flex-col ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500 ease-out delay-300 z-30`} /* Applied z-30 */
        >
          {/* Calendar Controls */}
          <div className="flex items-center justify-between p-4 border-b border-white/20">
            <div className="flex items-center gap-4">
              <button onClick={handleTodayClick} className="px-4 py-2 text-white bg-blue-500 rounded-md">Today</button>
              <div className="flex">
                <button onClick={handlePrevClick} className="p-2 text-white hover:bg-white/10 rounded-l-md">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button onClick={handleNextClick} className="p-2 text-white hover:bg-white/10 rounded-r-md">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
              <h2 className="text-xl font-semibold text-white">{formatHeaderDate()}</h2>
              
              {/* Google Calendar Sync Button */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSyncWithGoogle}
                  disabled={isSyncing}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                    isSyncing 
                      ? 'bg-white/5 text-white/50 cursor-not-allowed' 
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                  title={getSyncStatusText()}
                >
                  <div className={`${isSyncing ? 'animate-spin' : ''}`}>
                    {getSyncStatusIcon()}
                  </div>
                  <span className="hidden sm:inline">
                    {isSyncing ? 'Syncing...' : isGoogleConnected ? 'Sync Google' : 'Connect Google'}
                  </span>
                </button>
                
                {/* Sync Status Indicator */}
                {syncStatus && (
                  <div className="hidden md:flex items-center gap-1 px-2 py-1 bg-white/5 rounded-md text-xs text-white/70">
                    <span>📅</span>
                    <span>{syncStatus.syncedEvents}/{syncStatus.totalEvents}</span>
                    <span className={isGoogleConnected ? "text-emerald-400" : "text-gray-400"}>
                      {isGoogleConnected ? "🔗" : "🔌"}
                    </span>
                  </div>
                )}
                
                {/* Connection Status */}
                {isGoogleConnected && (
                  <div className="hidden lg:flex items-center gap-1 px-2 py-1 bg-emerald-500/10 rounded-md text-xs text-emerald-400">
                    <span>✅</span>
                    <span>Connected</span>
                  </div>
                )}

                {/* Debug Test Button (temporary) */}
                <button
                  onClick={createTestLocalEvent}
                  className="flex items-center gap-1 px-2 py-1 bg-orange-500/10 rounded-md text-xs text-orange-400 hover:bg-orange-500/20"
                >
                  <span>🧪</span>
                  <span>Test Event</span>
                </button>
                
                {/* Debug Log Events Button */}
                <button
                  onClick={() => {
                    console.log('=== CURRENT EVENTS DEBUG ===');
                    console.log('Total events:', events.length);
                    console.log('Current view:', currentView);
                    console.log('Current date:', currentDisplayDate.toString());
                    console.log('Week dates:', weekDates.map(d => d.toDateString()));
                    
                    events.forEach((event, idx) => {
                      console.log(`Event ${idx + 1}:`, {
                        id: event.id,
                        title: event.title,
                        startTime: event.startTime.toString(),
                        endTime: event.endTime.toString(),
                        startHour: event.startTime.getHours(),
                        endHour: event.endTime.getHours(),
                        color: event.color,
                        isToday: isSameDay(event.startTime, new Date()),
                        isThisWeek: weekDates.some(d => isSameDay(event.startTime, d))
                      });
                    });
                    
                    const todayEvents = events.filter(e => isSameDay(e.startTime, new Date()));
                    console.log(`Events for today (${new Date().toDateString()}):`, todayEvents.length);
                    
                    const weekEvents = events.filter(e => weekDates.some(d => isSameDay(e.startTime, d)));
                    console.log('Events for this week:', weekEvents.length);
                  }}
                  className="flex items-center gap-1 px-2 py-1 bg-purple-500/10 rounded-md text-xs text-purple-400 hover:bg-purple-500/20"
                >
                  <span>📋</span>
                  <span>Log Events</span>
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-md p-1">
              <button
                onClick={() => setCurrentView("day")}
                className={`px-3 py-1 rounded ${currentView === "day" ? "bg-white/20" : ""} text-white text-sm`}
              >
                Day
              </button>
              <button
                onClick={() => setCurrentView("week")}
                className={`px-3 py-1 rounded ${currentView === "week" ? "bg-white/20" : ""} text-white text-sm`}
              >
                Week
              </button>
              <button
                onClick={() => setCurrentView("month")}
                className={`px-3 py-1 rounded ${currentView === "month" ? "bg-white/20" : ""} text-white text-sm`}
              >
                Month
              </button>
            </div>
          </div>

          {/* Week View / Day View / Month View Container */}
          <div className="flex-1 overflow-auto p-4">
            {currentView === "week" && (
              <div className="bg-white/20 backdrop-blur-lg rounded-xl border border-white/20 shadow-xl h-full">
                {/* Week Header */}
                <div className="grid grid-cols-8 border-b border-white/20">
                  <div className="p-2 text-center text-white/50 text-xs"></div>
                  {weekDays.map((day, i) => (
                    <div key={i} className="p-2 text-center border-l border-white/20">
                      <div className="text-xs text-white/70 font-medium">{day}</div>
                      <div
                        className={`text-lg font-medium mt-1 text-white ${
                          isToday(weekDates[i]) ? "bg-blue-500 rounded-full w-8 h-8 flex items-center justify-center mx-auto" : ""
                        } ${
                          !isSameMonth(weekDates[i], currentDisplayDate) && currentView !== 'week' ? "text-white/50" : ""
                        } ${
                          dragOverDate && isSameDay(dragOverDate, weekDates[i]) ? "bg-green-500/50 rounded px-2 py-1" : ""
                        }`}
                        title={`Column ${i}: ${format(weekDates[i], 'yyyy-MM-dd EEEE')}`}
                      >
                        {format(weekDates[i], "d")}
                      </div>
                    </div>
                  ))}
                </div>
                {/* Time Grid */}
                <div className="grid grid-cols-8">
                  <div className="text-white/70">
                    {timeSlots.map((time, i) => (
                      <div key={i} className="h-20 border-b border-white/10 pr-2 text-right text-xs flex items-center justify-end">
                        {time > 12 ? `${time - 12} PM` : `${time} AM`}
                      </div>
                    ))}
                  </div>
                  {Array.from({ length: 7 }).map((_, dayIndex) => (
                    <div key={dayIndex} className="border-l border-white/20 relative">
                      {timeSlots.map((_, timeIndex) => {
                        const currentSlotDate = weekDates[dayIndex];
                        const currentSlotHour = timeSlots[timeIndex];
                        const isHighlighted = dragOverDate && dragOverTimeSlot !== null && 
                                            isSameDay(dragOverDate, currentSlotDate) && 
                                            dragOverTimeSlot === currentSlotHour;
                        return (
                          <div 
                            key={timeIndex} 
                            className={`h-20 border-b border-white/10 transition-colors duration-150 ease-in-out ${isHighlighted ? 'bg-blue-500/30' : ''} relative`}
                            style={{
                              // Add visual debug grid when debugging
                              ...(isHighlighted && {
                                border: '2px solid blue',
                                backgroundColor: 'rgba(59, 130, 246, 0.3)'
                              })
                            }}
                            title={`Time Slot: ${currentSlotHour}:00 (Index: ${timeIndex}, Expected Top: ${timeIndex * 80}px)`}
                            onDragOver={(e) => {
                              e.preventDefault(); 
                              // Only handle regular event dragging, not resizing
                              if (!resizingEvent && draggedEvent) {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const relativeY = e.clientY - rect.top;
                                
                                // Use the current time slot rather than calculating precise position
                                // This ensures we always use valid time slots
                                console.log('[DEBUG] Drag over - Week View:', {
                                  dayIndex,
                                  timeIndex,
                                  currentSlotHour,
                                  currentSlotDate: format(currentSlotDate, 'yyyy-MM-dd'),
                                  draggedEvent: draggedEvent.title,
                                  calculatedPosition: getGridPositionForHour(currentSlotHour),
                                  mouseY: e.clientY,
                                  dropZoneTop: rect.top,
                                  relativeY,
                                  dropZoneHeight: rect.height,
                                  expectedTop: timeIndex * 80
                                });
                                
                                setDragOverDate(currentSlotDate);
                                setDragOverTimeSlot(currentSlotHour);
                                setIsDragOver(true);
                              }
                            }}
                            onDragLeave={() => {
                              setIsDragOver(false);
                            }}
                            onDrop={async () => {
                              console.log('[Frontend] Drop event triggered - Week View', {
                                draggedEvent: draggedEvent?.title,
                                dragOverDate: dragOverDate ? format(dragOverDate, 'yyyy-MM-dd EEEE') : null,
                                dragOverTimeSlot,
                                dayIndex,
                                timeIndex,
                                currentSlotDate: format(currentSlotDate, 'yyyy-MM-dd EEEE'),
                                currentSlotHour,
                                originalEventTime: draggedEvent ? {
                                  start: format(draggedEvent.startTime, 'yyyy-MM-dd HH:mm'),
                                  end: format(draggedEvent.endTime, 'yyyy-MM-dd HH:mm')
                                } : null
                              });
                              
                              if (draggedEvent && dragOverDate && dragOverTimeSlot !== null) {
                                const duration = draggedEvent.endTime.getTime() - draggedEvent.startTime.getTime();
                                // Create new date using UTC methods to avoid timezone issues
                                const newStartTime = new Date(
                                  dragOverDate.getFullYear(),
                                  dragOverDate.getMonth(),
                                  dragOverDate.getDate(),
                                  dragOverTimeSlot,
                                  0, 0, 0
                                );
                                
                                const newEndTime = new Date(newStartTime.getTime() + duration);

                                                              console.log('[Frontend] Attempting to move event:', {
                                eventTitle: draggedEvent.title,
                                from: {
                                  startTime: draggedEvent.startTime,
                                  endTime: draggedEvent.endTime,
                                  startHour: draggedEvent.startTime.getHours(),
                                  endHour: draggedEvent.endTime.getHours()
                                },
                                to: {
                                  startTime: newStartTime,
                                  endTime: newEndTime, 
                                  startHour: newStartTime.getHours(),
                                  endHour: newEndTime.getHours()
                                },
                                dropSlot: dragOverTimeSlot,
                                expectedVisualPosition: getGridPositionForHour(dragOverTimeSlot)
                              });

                                // Use our safe update function instead of direct state manipulation
                                const success = await updateEventSafely(draggedEvent, newStartTime, newEndTime);
                                
                                if (success) {
                                  toast({
                                    title: "Event Moved",
                                    description: `"${draggedEvent.title}" has been moved successfully.`,
                                  });
                                }
                                
                                // Clear drag states
                                setDraggedEvent(null);
                                setDragOverDate(null);
                                setDragOverTimeSlot(null);
                                setIsDragOver(false);
                                setIsDraggingEvent(false);
                              }
                            }}
                          ></div>
                        )
                      })}
                      {(() => {
                        const safeEvents = getSafeEvents(events);
                        const dayEvents = safeEvents.filter((event) => isSameUTCDate(event.startTime, weekDates[dayIndex]));
                        // Only log for today to reduce noise
                        if (dayIndex === 0 && isToday(weekDates[dayIndex])) {
                          console.log(`[WEEK DEBUG] Today's events:`, {
                            totalEvents: events.length,
                            safeEvents: safeEvents.length,
                            dayEvents: dayEvents.length,
                            dayEventTitles: dayEvents.map(e => e.title)
                          });
                        }
                        return dayEvents;
                      })().map((event) => {
                          const eventStyle = calculateEventStyle(event.startTime, event.endTime, draggedEvent?.id === event.id)
                          return (
                            <div
                              key={event.id}
                              draggable // Make the event draggable
                              onDragStart={() => {
                                console.log('[Frontend] Drag start for event:', event.title);
                                setDraggedEvent(event);
                                setIsDraggingEvent(true);
                              }}
                              onDragEnd={() => {
                                console.log('[Frontend] Drag end for event');
                                setDraggedEvent(null); // Clean up after drag ends
                                setIsDraggingEvent(false);
                                // Only clear dragOverDate and dragOverTimeSlot if not actively resizing
                                if (!resizingEvent) {
                                  setDragOverDate(null);
                                  setDragOverTimeSlot(null);
                                }
                                setIsDragOver(false); // Always reset this
                              }}
                              className={`absolute rounded-md p-2 text-white text-xs shadow-md group transition-all duration-200 ease-in-out hover:translate-y-[-2px] hover:shadow-lg ${draggedEvent?.id === event.id ? 'cursor-grabbing' : 'cursor-pointer'} ${event.color || 'bg-blue-500'}`}
                              style={{
                                ...eventStyle,
                                left: "4px",
                                right: "4px",
                              }}
                              onClick={() => handleEventClick(event)}
                            >
                              <div className="font-medium">{event.title}</div>
                              <div className="opacity-80 text-[10px] mt-1">{`${format(event.startTime, "h:mm")} - ${format(event.endTime, "h:mm")}`}</div>
                              
                              {/* Delete Button */}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="absolute top-1 right-1 w-6 h-6 p-0 text-white/70 hover:text-white hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  
                                  if (window.confirm(`Are you sure you want to delete "${event.title}"? This action cannot be undone.`)) {
                                    handleDeleteEvent(event);
                                  }
                                }}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                              >
                                <Trash2 size={12} />
                              </Button>
                              
                              {/* Resize Handles */}
                              {!draggedEvent && !isDraggingEvent && (
                                <>
                                  <div 
                                    draggable 
                                    onDragStart={(e) => {
                                      e.stopPropagation(); // Prevent event drag when resizing
                                      console.log('[DEBUG] Starting resize - top handle');
                                      setResizingEvent({ 
                                        event,
                                        handle: 'top',
                                        initialY: e.clientY,
                                        originalStartTime: event.startTime,
                                        originalEndTime: event.endTime
                                      });
                                      // Do not set draggedEvent here to avoid conflict
                                    }}
                                    onDrag={(e) => {
                                      e.stopPropagation();
                                      if (resizingEvent && e.clientY !== 0) { // e.clientY is 0 on drag end
                                        const pixelToMinuteRatio = 80 / 60; // 80px per hour 
                                        const deltaY = e.clientY - resizingEvent.initialY;
                                        const deltaMinutes = Math.round(deltaY / pixelToMinuteRatio);

                                        // Adjust start time
                                        const newStartTime = new Date(resizingEvent.originalStartTime.getTime() + (deltaMinutes * 60000));
                                        const newEndTime = new Date(resizingEvent.originalEndTime);
                                        
                                        // SAFE: Only update preview state during drag - DO NOT modify main events state
                                        setPreviewEvent({
                                          ...resizingEvent.event,
                                          startTime: newStartTime,
                                          endTime: newEndTime
                                        });
                                        setIsResizingEvent(true);
                                      }
                                    }}
                                                                      onDragEnd={(e) => {
                                    e.stopPropagation();
                                    if (resizingEvent && previewEvent) {
                                      // SAFE: Use preview event data instead of corrupted main state
                                      console.log('[Frontend] Top resize handle dragEnd', {
                                        originalTitle: resizingEvent.event.title,
                                        previewTitle: previewEvent.title
                                      });
                                      handleResizeEnd(resizingEvent.event, previewEvent.startTime, previewEvent.endTime);
                                    } else if (resizingEvent) {
                                      // Fallback: use original event data if preview failed
                                      console.log('[Frontend] Top resize handle dragEnd fallback');
                                      handleResizeEnd(resizingEvent.event, resizingEvent.originalStartTime, resizingEvent.originalEndTime);
                                    }
                                    setResizingEvent(null);
                                    setIsDragOver(false);
                                  }}
                                    className="absolute -top-1 left-0 w-full h-2 cursor-n-resize opacity-0 group-hover:opacity-100 bg-black/20 rounded-t-md z-10"
                                  />
                                  <div 
                                    draggable 
                                    onDragStart={(e) => {
                                      e.stopPropagation();
                                      console.log('[DEBUG] Starting resize - bottom handle');
                                      setResizingEvent({ 
                                        event,
                                        handle: 'bottom',
                                        initialY: e.clientY,
                                        originalStartTime: event.startTime,
                                        originalEndTime: event.endTime
                                      });
                                    }}
                                    onDrag={(e) => {
                                      e.stopPropagation();
                                      if (resizingEvent && e.clientY !== 0) { // e.clientY is 0 on drag end
                                        const pixelToMinuteRatio = 80 / 60; // 80px per hour 
                                        const deltaY = e.clientY - resizingEvent.initialY;
                                        const deltaMinutes = Math.round(deltaY / pixelToMinuteRatio);

                                        // Adjust end time
                                        const newStartTime = new Date(resizingEvent.originalStartTime);
                                        const newEndTime = new Date(resizingEvent.originalEndTime.getTime() + (deltaMinutes * 60000));
                                        
                                        // SAFE: Only update preview state during drag - DO NOT modify main events state
                                        setPreviewEvent({
                                          ...resizingEvent.event,
                                          startTime: newStartTime,
                                          endTime: newEndTime
                                        });
                                        setIsResizingEvent(true);
                                      }
                                    }}
                                    onDragEnd={(e) => {
                                      e.stopPropagation();
                                      if (resizingEvent && previewEvent) {
                                        // SAFE: Use preview event data instead of corrupted main state
                                        console.log('[Frontend] Bottom resize handle dragEnd', {
                                          originalTitle: resizingEvent.event.title,
                                          previewTitle: previewEvent.title
                                        });
                                        handleResizeEnd(resizingEvent.event, previewEvent.startTime, previewEvent.endTime);
                                      } else if (resizingEvent) {
                                        // Fallback: use original event data if preview failed
                                        console.log('[Frontend] Bottom resize handle dragEnd fallback');
                                        handleResizeEnd(resizingEvent.event, resizingEvent.originalStartTime, resizingEvent.originalEndTime);
                                      }
                                      setResizingEvent(null);
                                      setIsDragOver(false);
                                    }}
                                    className="absolute -bottom-1 left-0 w-full h-2 cursor-s-resize opacity-0 group-hover:opacity-100 bg-black/20 rounded-b-md z-10"
                                  />
                                </> 
                              )}
                            </div>
                          )
                        })}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentView === "day" && (
              <div className="bg-white/20 backdrop-blur-lg rounded-xl border border-white/20 shadow-xl h-full flex flex-col">
                {/* Day Header */}
                <div className="grid grid-cols-2 border-b border-white/20"> {/* Adjusted for Day View: Time slot column + Day column */}
                  <div className="p-2 text-center text-white/50 text-xs"></div> {/* Spacer for time column */}
                  <div className="p-2 text-center border-l border-white/20">
                    <div className="text-xs text-white/70 font-medium">{format(currentDisplayDate, "EEE").toUpperCase()}</div>
                    <div
                      className={`text-lg font-medium mt-1 text-white ${
                        isToday(currentDisplayDate) ? "bg-blue-500 rounded-full w-8 h-8 flex items-center justify-center mx-auto" : ""
                      }`}
                    >
                      {format(currentDisplayDate, "d")}
                    </div>
                  </div>
                </div>
                {/* Time Grid for Day View */}
                <div className="grid grid-cols-2 flex-1"> {/* Adjusted for Day View */}
                  <div className="text-white/70"> {/* Time slots column */}
                    {timeSlots.map((time, i) => (
                      <div key={i} className="h-20 border-b border-white/10 pr-2 text-right text-xs flex items-center justify-end">
                        {time > 12 ? `${time - 12} PM` : `${time} AM`}
                      </div>
                    ))}
                  </div>
                  <div className="border-l border-white/20 relative"> {/* Single day column */}
                    {timeSlots.map((_, timeIndex) => {
                      const currentSlotDate = currentDisplayDate; // For day view, it's always currentDisplayDate
                      const currentSlotHour = timeSlots[timeIndex];
                      const isHighlighted = dragOverDate && dragOverTimeSlot !== null &&
                                          isSameDay(dragOverDate, currentSlotDate) &&
                                          dragOverTimeSlot === currentSlotHour;
                      return (
                        <div 
                          key={timeIndex} 
                          className={`h-20 border-b border-white/10 transition-colors duration-150 ease-in-out ${isHighlighted ? 'bg-blue-500/30' : ''} relative`}
                          style={{
                            // Add visual debug grid when debugging
                            ...(isHighlighted && {
                              border: '2px solid blue',
                              backgroundColor: 'rgba(59, 130, 246, 0.3)'
                            })
                          }}
                          title={`Time Slot: ${currentSlotHour}:00 (Index: ${timeIndex}, Expected Top: ${timeIndex * 80}px)`}
                          onDragOver={(e) => {
                            e.preventDefault();
                            // Only handle regular event dragging, not resizing
                            if (!resizingEvent && draggedEvent) {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const relativeY = e.clientY - rect.top;
                              
                              // Use the current time slot to ensure consistency
                              console.log('[DEBUG] Drag over - Day View:', {
                                timeIndex,
                                currentSlotHour,
                                currentSlotDate: format(currentSlotDate, 'yyyy-MM-dd'),
                                draggedEvent: draggedEvent.title,
                                calculatedPosition: getGridPositionForHour(currentSlotHour),
                                mouseY: e.clientY,
                                dropZoneTop: rect.top,
                                relativeY,
                                dropZoneHeight: rect.height,
                                expectedTop: timeIndex * 80
                              });
                              
                              setDragOverDate(currentSlotDate);
                              setDragOverTimeSlot(currentSlotHour);
                              setIsDragOver(true);
                            }
                          }}
                          onDragLeave={() => {
                            setIsDragOver(false);
                          }}
                          onDrop={async () => {
                            console.log('[Frontend] Day view drop event triggered', {
                              draggedEvent: draggedEvent?.title,
                              dragOverDate: dragOverDate ? format(dragOverDate, 'yyyy-MM-dd EEEE') : null,
                              dragOverTimeSlot,
                              timeIndex,
                              currentSlotDate: format(currentSlotDate, 'yyyy-MM-dd EEEE'),
                              currentSlotHour,
                              originalEventTime: draggedEvent ? {
                                start: format(draggedEvent.startTime, 'yyyy-MM-dd HH:mm'),
                                end: format(draggedEvent.endTime, 'yyyy-MM-dd HH:mm')
                              } : null
                            });
                            
                            if (draggedEvent && dragOverDate && dragOverTimeSlot !== null) {
                              const duration = draggedEvent.endTime.getTime() - draggedEvent.startTime.getTime();
                              // Create new date using explicit constructor to avoid timezone issues
                              const newStartTime = new Date(
                                dragOverDate.getFullYear(),
                                dragOverDate.getMonth(),
                                dragOverDate.getDate(),
                                dragOverTimeSlot,
                                0, 0, 0
                              );
                              
                              const newEndTime = new Date(newStartTime.getTime() + duration);

                              console.log('[Frontend] Day view attempting to move event:', {
                                eventTitle: draggedEvent.title,
                                from: {
                                  startTime: draggedEvent.startTime,
                                  endTime: draggedEvent.endTime,
                                  startHour: draggedEvent.startTime.getHours(),
                                  endHour: draggedEvent.endTime.getHours()
                                },
                                to: {
                                  startTime: newStartTime,
                                  endTime: newEndTime,
                                  startHour: newStartTime.getHours(),
                                  endHour: newEndTime.getHours()
                                },
                                dropSlot: dragOverTimeSlot,
                                expectedVisualPosition: getGridPositionForHour(dragOverTimeSlot)
                              });

                              // Use our safe update function instead of direct state manipulation
                              const success = await updateEventSafely(draggedEvent, newStartTime, newEndTime);
                              
                              if (success) {
                                toast({
                                  title: "Event Moved",
                                  description: `"${draggedEvent.title}" has been moved successfully.`,
                                });
                              }
                              
                              // Clear drag states
                              setDraggedEvent(null);
                              setDragOverDate(null);
                              setDragOverTimeSlot(null);
                              setIsDragOver(false);
                              setIsDraggingEvent(false);
                            }
                          }}
                        ></div>
                      );
                    })}
                    {(() => {
                      const safeEvents = getSafeEvents(events);
                      const dayEvents = safeEvents.filter((event) => isSameUTCDate(event.startTime, currentDisplayDate));
                      console.log(`[DAY DEBUG] Events for ${currentDisplayDate.toDateString()}:`, {
                        totalEvents: events.length,
                        safeEvents: safeEvents.length,
                        dayEvents: dayEvents.length,
                        dayEventTitles: dayEvents.map(e => e.title)
                      });
                      return dayEvents;
                    })().map((event) => {
                        const eventStyle = calculateEventStyle(event.startTime, event.endTime, draggedEvent?.id === event.id);
                        return (
                          <div
                            key={event.id}
                            draggable
                            onDragStart={() => {
                              console.log('[Frontend] Day view drag start for event:', event.title);
                              setDraggedEvent(event);
                              setIsDraggingEvent(true);
                            }}
                            onDragEnd={() => {
                              console.log('[Frontend] Day view drag end for event');
                              setDraggedEvent(null);
                              setIsDraggingEvent(false);
                              if (!resizingEvent) {
                                setDragOverDate(null);
                                setDragOverTimeSlot(null);
                              }
                              setIsDragOver(false);
                            }}
                            className={`absolute rounded-md p-2 text-white text-xs shadow-md group cursor-pointer transition-all duration-200 ease-in-out hover:translate-y-[-2px] hover:shadow-lg ${draggedEvent?.id === event.id ? 'cursor-grabbing' : 'cursor-pointer'} ${event.color || 'bg-blue-500'}`}
                            style={{
                              ...eventStyle,
                              left: "4px",
                              right: "4px",
                            }}
                            onClick={() => handleEventClick(event)}
                          >
                            <div className="font-medium">{event.title}</div>
                            <div className="opacity-80 text-[10px] mt-1">{`${format(event.startTime, "h:mm aa")} - ${format(event.endTime, "h:mm aa")}`}</div>
                            
                            {/* Delete Button */}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="absolute top-1 right-1 w-6 h-6 p-0 text-white/70 hover:text-white hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                
                                if (window.confirm(`Are you sure you want to delete "${event.title}"? This action cannot be undone.`)) {
                                  handleDeleteEvent(event);
                                }
                              }}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                            >
                              <Trash2 size={12} />
                            </Button>
                            
                            {/* Resize Handles */}
                            {!draggedEvent && !isDraggingEvent && (
                              <>
                                <div 
                                  draggable 
                                  onDragStart={(e) => {
                                    e.stopPropagation();
                                    console.log('[DEBUG] Day view - Starting resize - top handle');
                                    setResizingEvent({ 
                                      event,
                                      handle: 'top',
                                      initialY: e.clientY,
                                      originalStartTime: event.startTime,
                                      originalEndTime: event.endTime
                                    });
                                  }}
                                  onDrag={(e) => {
                                    e.stopPropagation();
                                    if (resizingEvent && e.clientY !== 0) { // e.clientY is 0 on drag end
                                      const pixelToMinuteRatio = 80 / 60; // 80px per hour 
                                      const deltaY = e.clientY - resizingEvent.initialY;
                                      const deltaMinutes = Math.round(deltaY / pixelToMinuteRatio);

                                      // Adjust start time
                                      const newStartTime = new Date(resizingEvent.originalStartTime.getTime() + (deltaMinutes * 60000));
                                      const newEndTime = new Date(resizingEvent.originalEndTime);
                                      
                                      // SAFE: Only update preview state during drag - DO NOT modify main events state
                                      setPreviewEvent({
                                        ...resizingEvent.event,
                                        startTime: newStartTime,
                                        endTime: newEndTime
                                      });
                                      setIsResizingEvent(true);
                                    }
                                  }}
                                  onDragEnd={(e) => {
                                    e.stopPropagation();
                                    if (resizingEvent && previewEvent) {
                                      // SAFE: Use preview event data instead of corrupted main state
                                      console.log('[Frontend] Day view top resize handle dragEnd', {
                                        originalTitle: resizingEvent.event.title,
                                        previewTitle: previewEvent.title
                                      });
                                      handleResizeEnd(resizingEvent.event, previewEvent.startTime, previewEvent.endTime);
                                    } else if (resizingEvent) {
                                      // Fallback: use original event data if preview failed
                                      console.log('[Frontend] Day view top resize handle dragEnd fallback');
                                      handleResizeEnd(resizingEvent.event, resizingEvent.originalStartTime, resizingEvent.originalEndTime);
                                    }
                                    setResizingEvent(null);
                                    setIsDragOver(false);
                                  }}
                                  className="absolute -top-1 left-0 w-full h-2 cursor-n-resize opacity-0 group-hover:opacity-100 bg-black/20 rounded-t-md z-10"
                                />
                                <div 
                                  draggable 
                                  onDragStart={(e) => {
                                    e.stopPropagation();
                                    console.log('[DEBUG] Day view - Starting resize - bottom handle');
                                    setResizingEvent({ 
                                      event,
                                      handle: 'bottom',
                                      initialY: e.clientY,
                                      originalStartTime: event.startTime,
                                      originalEndTime: event.endTime
                                    });
                                  }}
                                  onDrag={(e) => {
                                    e.stopPropagation();
                                    if (resizingEvent && e.clientY !== 0) { // e.clientY is 0 on drag end
                                      const pixelToMinuteRatio = 80 / 60; // 80px per hour 
                                      const deltaY = e.clientY - resizingEvent.initialY;
                                      const deltaMinutes = Math.round(deltaY / pixelToMinuteRatio);

                                      // Adjust end time
                                      const newStartTime = new Date(resizingEvent.originalStartTime);
                                      const newEndTime = new Date(resizingEvent.originalEndTime.getTime() + (deltaMinutes * 60000));
                                      
                                      // SAFE: Only update preview state during drag - DO NOT modify main events state
                                      setPreviewEvent({
                                        ...resizingEvent.event,
                                        startTime: newStartTime,
                                        endTime: newEndTime
                                      });
                                      setIsResizingEvent(true);
                                    }
                                  }}
                                  onDragEnd={(e) => {
                                    e.stopPropagation();
                                    if (resizingEvent && previewEvent) {
                                      // SAFE: Use preview event data instead of corrupted main state
                                      console.log('[Frontend] Day view bottom resize handle dragEnd', {
                                        originalTitle: resizingEvent.event.title,
                                        previewTitle: previewEvent.title
                                      });
                                      handleResizeEnd(resizingEvent.event, previewEvent.startTime, previewEvent.endTime);
                                    } else if (resizingEvent) {
                                      // Fallback: use original event data if preview failed
                                      console.log('[Frontend] Day view bottom resize handle dragEnd fallback');
                                      handleResizeEnd(resizingEvent.event, resizingEvent.originalStartTime, resizingEvent.originalEndTime);
                                    }
                                    setResizingEvent(null);
                                    setIsDragOver(false);
                                  }}
                                  className="absolute -bottom-1 left-0 w-full h-2 cursor-s-resize opacity-0 group-hover:opacity-100 bg-black/20 rounded-b-md z-10"
                                />
                              </>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}
            {currentView === "month" && (
              <div className="bg-white/20 backdrop-blur-lg rounded-xl border border-white/20 shadow-xl h-full flex flex-col">
                {/* Month Header - Days of the week */}
                <div className="grid grid-cols-7 border-b border-white/20">
                  {weekDays.map((day, i) => (
                    <div key={i} className={`p-2 text-center text-xs text-white/70 font-medium ${i > 0 ? 'border-l border-white/20' : ''}`}>
                      {day}
                    </div>
                  ))}
                </div>
                {/* Month Grid */}
                <div className="grid grid-cols-7 grid-rows-6 flex-1"> {/* Assuming max 6 weeks for a month view */}
                  {(() => {
                    const monthStart = startOfMonth(currentDisplayDate);
                    const monthEnd = endOfMonth(currentDisplayDate);
                    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
                    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
                    
                    const daysInGrid = eachDayOfInterval({ start: startDate, end: endDate });

                    return daysInGrid.map((day, i) => (
                      <div 
                        key={i} 
                        className={`p-2 border-b border-r border-white/10 ${ 
                          !isSameMonth(day, currentDisplayDate) ? 'text-white/40' : 'text-white'
                        } ${ 
                          isToday(day) ? 'bg-blue-500/30' : ''
                        } ${ 
                          (i + 1) % 7 === 0 ? 'border-r-0' : '' // No right border for last column
                        } ${ 
                          i >= daysInGrid.length - 7 ? 'border-b-0' : '' // No bottom border for last row (approx)
                        } ${// Highlight for month view drop target
                          dragOverDate && isSameDay(dragOverDate, day) && draggedEvent ? 'bg-blue-500/40' : ''
                        } transition-colors duration-150 ease-in-out`}
                        onClick={() => {
                            setCurrentDisplayDate(day);
                            setCurrentView('day');
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (draggedEvent) { // Only set drag over date if an event is being dragged
                            setDragOverDate(day);
                            setIsDragOver(true);
                          }
                        }}
                        onDragLeave={() => {
                          if (draggedEvent) {
                            setIsDragOver(false);
                            // Consider if dragOverDate should be cleared here or only onDragEnd/onDrop
                          }
                        }}
                        onDrop={() => {
                          if (draggedEvent && dragOverDate) {
                            // Create new dates using explicit constructor to avoid timezone issues
                            const newStartDate = new Date(
                              dragOverDate.getFullYear(),
                              dragOverDate.getMonth(),
                              dragOverDate.getDate(),
                              draggedEvent.startTime.getHours(),
                              draggedEvent.startTime.getMinutes(),
                              draggedEvent.startTime.getSeconds(),
                              draggedEvent.startTime.getMilliseconds()
                            );

                            const newEndDate = new Date(
                              dragOverDate.getFullYear(),
                              dragOverDate.getMonth(),
                              dragOverDate.getDate(),
                              draggedEvent.endTime.getHours(),
                              draggedEvent.endTime.getMinutes(),
                              draggedEvent.endTime.getSeconds(),
                              draggedEvent.endTime.getMilliseconds()
                            );
                            
                            // If the event duration makes it span across midnight to the next day after dragging,
                            // ensure the end date is also updated correctly.
                            if (newEndDate < newStartDate) { // This can happen if original event spanned midnight
                                newEndDate.setDate(newEndDate.getDate() + (draggedEvent.endTime.getDate() - draggedEvent.startTime.getDate()));
                            }

                            setEvents(prevEvents =>
                              prevEvents.map(e =>
                                e.id === draggedEvent.id
                                  ? { ...e, startTime: newStartDate, endTime: newEndDate }
                                  : e
                              )
                            );
                            setDraggedEvent(null);
                            setDragOverDate(null);
                            setDragOverTimeSlot(null); // Clear this as it's not relevant for month drop
                            setIsDragOver(false);
                          }
                        }}
                      >
                        <div className={`text-sm text-right ${isToday(day) ? 'font-bold' : ''}`}>{format(day, "d")}</div>
                        <div className="mt-1 space-y-0.5 overflow-hidden text-[10px]">
                          {events
                            .filter(event => isSameDay(event.startTime, day))
                            .slice(0, 2) // Show max 2 events per day in month view for brevity
                            .map(event => (
                              <div 
                                key={event.id} 
                                className={`${event.color} rounded px-1 py-0.5 text-white truncate cursor-pointer hover:opacity-80 group relative`}
                                onClick={(e) => { e.stopPropagation(); handleEventClick(event); }}
                              >
                                <span className="truncate">{event.title}</span>
                                <button
                                  className="absolute top-0 right-0 w-4 h-4 text-white/70 hover:text-white hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-sm z-10"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    
                                    if (window.confirm(`Are you sure you want to delete "${event.title}"? This action cannot be undone.`)) {
                                      handleDeleteEvent(event);
                                    }
                                  }}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                >
                                  <Trash2 size={8} />
                                </button>
                              </div>
                            ))}
                          {events.filter(event => isSameDay(event.startTime, day)).length > 2 && (
                            <div className="text-white/70 text-center">...</div>
                          )}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Selected Event Modal - Restored (conditionally rendered by selectedEvent state) */}
        {selectedEventForDisplay && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"> {/* High z-index for modal */}
            <div className={`${selectedEventForDisplay.color} p-6 rounded-lg shadow-xl max-w-md w-full mx-4 text-white`}>
              <h3 className="text-2xl font-bold mb-4">{selectedEventForDisplay.title}</h3>
              <div className="space-y-3">
                <p className="flex items-center">
                  <Clock className="mr-2 h-5 w-5" />
                  {`${format(selectedEventForDisplay.startTime, "h:mm aa")} - ${format(selectedEventForDisplay.endTime, "h:mm aa")}`}
                </p>
                <p className="flex items-center">
                  <MapPin className="mr-2 h-5 w-5" />
                  {selectedEventForDisplay.location}
                </p>
                <p className="flex items-center">
                  <CalendarIcon className="mr-2 h-5 w-5" />
                  {selectedEventForDisplay.startTime ? `${format(selectedEventForDisplay.startTime, "EEE, MMM d")}` : ""}
                </p>
                <p className="flex items-start">
                  <Users className="mr-2 h-5 w-5 mt-1" />
                  <span>
                    <strong>Attendees:</strong>
                    <br />
                    {selectedEventForDisplay.attendees.join(", ") || "No attendees"}
                  </span>
                </p>
                <p>
                  <strong>Organizer:</strong> {selectedEventForDisplay.organizer}
                </p>
                <p>
                  <strong>Description:</strong> {selectedEventForDisplay.description}
                </p>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  className="bg-white/90 text-gray-800 px-4 py-2 rounded hover:bg-white transition-colors mr-2"
                  onClick={() => {
                    if (selectedEventForDisplay) {
                      handleEventClick(selectedEventForDisplay); // This will open the edit modal
                      setSelectedEventForDisplay(null); // Close the display modal
                    }
                  }}
                >
                  Edit
                </button>
                <button
                  className="bg-white/90 text-gray-800 px-4 py-2 rounded hover:bg-white transition-colors"
                  onClick={() => setSelectedEventForDisplay(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create/Edit Event Modal */}
        {isEventModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-slate-800 p-6 rounded-lg shadow-xl max-w-lg w-full text-white border border-slate-700">
              <h3 className="text-xl font-semibold mb-6">
                {modalMode === "create" ? "Create New Event" : "Edit Event"}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="eventTitle" className="block text-sm font-medium text-slate-300 mb-1">Title</label>
                  <input 
                    type="text" 
                    id="eventTitle"
                    value={newEventTitle}
                    onChange={(e) => setNewEventTitle(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500 placeholder-slate-400"
                    placeholder="e.g., Team Meeting"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="eventStartDate" className="block text-sm font-medium text-slate-300 mb-1">Start Date</label>
                    <input 
                      type="date" 
                      id="eventStartDate"
                      value={newEventStartDate}
                      onChange={(e) => setNewEventStartDate(e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500 tabular-nums"
                    />
                  </div>
                  <div>
                    <label htmlFor="eventStartTime" className="block text-sm font-medium text-slate-300 mb-1">Start Time</label>
                    <input 
                      type="time" 
                      id="eventStartTime"
                      value={newEventStartTime}
                      onChange={(e) => setNewEventStartTime(e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="eventEndDate" className="block text-sm font-medium text-slate-300 mb-1">End Date</label>
                    <input 
                      type="date" 
                      id="eventEndDate"
                      value={newEventEndDate}
                      onChange={(e) => setNewEventEndDate(e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500 tabular-nums"
                    />
                  </div>
                  <div>
                    <label htmlFor="eventEndTime" className="block text-sm font-medium text-slate-300 mb-1">End Time</label>
                    <input 
                      type="time" 
                      id="eventEndTime"
                      value={newEventEndTime}
                      onChange={(e) => setNewEventEndTime(e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="eventDescription" className="block text-sm font-medium text-slate-300 mb-1">Description (Optional)</label>
                  <textarea 
                    id="eventDescription"
                    value={newEventDescription}
                    onChange={(e) => setNewEventDescription(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500 placeholder-slate-400"
                    placeholder="Add more details..."
                  />
                </div>

                <div>
                  <label htmlFor="eventColor" className="block text-sm font-medium text-slate-300 mb-1">Color</label>
                  <select 
                    id="eventColor"
                    value={newEventColor}
                    onChange={(e) => setNewEventColor(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    {myCalendars.map(cal => (
                      <option key={cal.name} value={cal.color} className="text-white">
                        {cal.name} ({cal.color.replace('bg-', '').replace('-500', '')})
                      </option>
                    ))}
                    {/* Add a generic option if no calendars exist or for a default */}
                    {!myCalendars.find(cal => cal.color === newEventColor) && (
                       <option value={newEventColor} className="text-white">
                         {newEventColor.replace('bg-', '').replace('-500', '')}
                       </option>
                    )}
                  </select>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button 
                  onClick={closeEventModal}
                  className="px-4 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors border border-slate-600"
                >
                  Cancel
                </button>
                <button 
                  onClick={(e) => {
                    console.log('[Frontend] Update Event button clicked');
                    console.log('[Frontend] Event object:', e);
                    console.log('[Frontend] Current modalMode:', modalMode);
                    handleSubmitEvent();
                  }}
                  className="px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800"
                >
                  {modalMode === "create" ? "Save Event" : "Update Event"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
} 