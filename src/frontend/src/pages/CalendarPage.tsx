"use client" // This directive is Next.js specific, can be removed for Vite/React

import { useState, useEffect } from "react"
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
} from "lucide-react"
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
  id: number;
  title: string;
  startTime: Date;
  endTime: Date;
  color: string;
  description: string;
  location: string;
  attendees: string[];
  organizer: string;
}


export default function CalendarPage() { // Renamed from Home for clarity
  const [isLoaded, setIsLoaded] = useState(false)
  // const [showAIPopup, setShowAIPopup] = useState(false) // AI Popup logic remains commented out
  // const [typedText, setTypedText] = useState("")
  // const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    setIsLoaded(true)
    // AI Popup timer logic remains commented out
  }, [])

  // AI Popup typing useEffect remains commented out

  const [currentView, setCurrentView] = useState("week")
  const [currentDisplayDate, setCurrentDisplayDate] = useState(new Date()) // Date object for current view
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)

  // Initial events data - this will be moved into state
  const initialEvents: CalendarEvent[] = [
    {
      id: 1,
      title: "Team Meeting",
      startTime: new Date(2025, 2, 3, 9, 0),
      endTime: new Date(2025, 2, 3, 10, 0),
      color: "bg-blue-500",
      description: "Weekly team sync-up",
      location: "Conference Room A",
      attendees: ["John Doe", "Jane Smith", "Bob Johnson"],
      organizer: "Alice Brown",
    },
    {
      id: 2,
      title: "Lunch with Sarah",
      startTime: new Date(2025, 2, 3, 12, 30),
      endTime: new Date(2025, 2, 3, 13, 30),
      color: "bg-green-500",
      description: "Discuss project timeline",
      location: "Cafe Nero",
      attendees: ["Sarah Lee"],
      organizer: "You",
    },
    {
      id: 3,
      title: "Project Review",
      startTime: new Date(2025, 2, 5, 14, 0),
      endTime: new Date(2025, 2, 5, 15, 30),
      color: "bg-purple-500",
      description: "Q2 project progress review",
      location: "Meeting Room 3",
      attendees: ["Team Alpha", "Stakeholders"],
      organizer: "Project Manager",
    },
    {
      id: 4,
      title: "Client Call",
      startTime: new Date(2025, 2, 4, 10, 0),
      endTime: new Date(2025, 2, 4, 11, 0),
      color: "bg-yellow-500",
      description: "Quarterly review with major client",
      location: "Zoom Meeting",
      attendees: ["Client Team", "Sales Team"],
      organizer: "Account Manager",
    },
    {
      id: 5,
      title: "Team Brainstorm",
      startTime: new Date(2025, 2, 6, 13, 0),
      endTime: new Date(2025, 2, 6, 14, 30),
      color: "bg-indigo-500",
      description: "Ideation session for new product features",
      location: "Creative Space",
      attendees: ["Product Team", "Design Team"],
      organizer: "Product Owner",
    },
    {
      id: 6,
      title: "Future Planning",
      startTime: new Date(2025, 2, 10, 11, 0),
      endTime: new Date(2025, 2, 10, 12, 0),
      color: "bg-pink-500",
      description: "Planning for Q3",
      location: "Strategy Room",
      attendees: ["Leadership"],
      organizer: "CEO",
    },
    {
      id: 9,
      title: "Morning Standup",
      startTime: new Date(2025, 2, 4, 8, 30),
      endTime: new Date(2025, 2, 4, 9, 30),
      color: "bg-blue-400",
      description: "Daily team standup",
      location: "Slack Huddle",
      attendees: ["Development Team"],
      organizer: "Scrum Master",
    },
    {
      id: 10,
      title: "Design Review",
      startTime: new Date(2025, 2, 7, 14, 30),
      endTime: new Date(2025, 2, 7, 15, 45),
      color: "bg-purple-400",
      description: "Review new UI designs",
      location: "Design Lab",
      attendees: ["UX Team", "Product Manager"],
      organizer: "Lead Designer",
    },
    {
      id: 11,
      title: "Investor Meeting",
      startTime: new Date(2025, 2, 7, 10, 30),
      endTime: new Date(2025, 2, 7, 12, 0),
      color: "bg-red-400",
      description: "Quarterly investor update",
      location: "Board Room",
      attendees: ["Executive Team", "Investors"],
      organizer: "CEO",
    },
    {
      id: 12,
      title: "Team Training",
      startTime: new Date(2025, 2, 5, 9, 30),
      endTime: new Date(2025, 2, 5, 11, 30),
      color: "bg-green-400",
      description: "New tool onboarding session",
      location: "Training Room",
      attendees: ["All Departments"],
      organizer: "HR",
    },
    {
      id: 13,
      title: "Budget Review",
      startTime: new Date(2025, 2, 5, 13, 30),
      endTime: new Date(2025, 2, 5, 15, 0),
      color: "bg-yellow-400",
      description: "Quarterly budget analysis",
      location: "Finance Office",
      attendees: ["Finance Team", "Department Heads"],
      organizer: "CFO",
    },
    {
      id: 14,
      title: "Client Presentation",
      startTime: new Date(2025, 2, 6, 11, 0),
      endTime: new Date(2025, 2, 6, 12, 30),
      color: "bg-orange-400",
      description: "Present new project proposal",
      location: "Client Office",
      attendees: ["Sales Team", "Client Representatives"],
      organizer: "Account Executive",
    },
    {
      id: 15,
      title: "Product Planning",
      startTime: new Date(2025, 2, 5, 14, 0),
      endTime: new Date(2025, 2, 5, 15, 30),
      color: "bg-pink-400",
      description: "Roadmap discussion for Q3",
      location: "Strategy Room",
      attendees: ["Product Team", "Engineering Leads"],
      organizer: "Product Manager",
    },
  ]
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);

  // State for the Create Event Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventStartDate, setNewEventStartDate] = useState("");
  const [newEventStartTime, setNewEventStartTime] = useState("");
  const [newEventEndDate, setNewEventEndDate] = useState("");
  const [newEventEndTime, setNewEventEndTime] = useState("");
  const [newEventDescription, setNewEventDescription] = useState("");
  const [newEventColor, setNewEventColor] = useState("bg-blue-500"); // Default color

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event)
  }

  const openCreateModal = (date?: Date) => {
    const targetDate = date || currentDisplayDate; // Use provided date or current display date
    setNewEventTitle("");
    setNewEventStartDate(format(targetDate, "yyyy-MM-dd"));
    setNewEventStartTime("09:00"); // Default start time
    setNewEventEndDate(format(targetDate, "yyyy-MM-dd"));
    setNewEventEndTime("10:00");   // Default end time
    setNewEventDescription("");
    setNewEventColor(myCalendars[0]?.color || "bg-blue-500"); // Default to first calendar color
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    // Optionally reset fields here if not reset on open
  };

  const handleSaveEvent = () => {
    if (!newEventTitle || !newEventStartDate || !newEventStartTime || !newEventEndDate || !newEventEndTime) {
      alert("Please fill in all required fields: Title, Start Date/Time, End Date/Time.");
      return;
    }

    // Combine date and time strings into Date objects
    const startDateTime = new Date(`${newEventStartDate}T${newEventStartTime}`);
    const endDateTime = new Date(`${newEventEndDate}T${newEventEndTime}`);

    if (endDateTime <= startDateTime) {
      alert("End time must be after start time.");
      return;
    }

    const newEventToAdd: CalendarEvent = {
      id: Date.now(), // Simple unique ID
      title: newEventTitle,
      startTime: startDateTime,
      endTime: endDateTime,
      description: newEventDescription,
      color: newEventColor,
      location: "", // Placeholder, can add to form
      attendees: [], // Placeholder, can add to form
      organizer: "You", // Placeholder
    };

    setEvents(prevEvents => [...prevEvents, newEventToAdd]);
    closeCreateModal();
  };

  // Sample calendar days for the week view
  const weekDays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]
  // These dates would need to be dynamically generated based on the current date/month
  const weekDates = eachDayOfInterval({
    start: startOfWeek(currentDisplayDate, { weekStartsOn: 0 }), // Sunday as start of week
    end: endOfWeek(currentDisplayDate, { weekStartsOn: 0 }),
  })
  const timeSlots = Array.from({ length: 9 }, (_, i) => i + 8) // 8 AM to 4 PM (exclusive of 5 PM)

  // Helper function to calculate event position and height
  const calculateEventStyle = (startTime: Date, endTime: Date) => {
    const startHour = startTime.getHours();
    const startMinute = startTime.getMinutes();
    const endHour = endTime.getHours();
    const endMinute = endTime.getMinutes();

    const start = startHour + startMinute / 60;
    const end = endHour + endMinute / 60;
    
    const top = (start - 8) * 80 // 80px per hour, assuming 8 AM is the start of the grid
    const height = (end - start) * 80
    return { top: `${top}px`, height: `${height}px` }
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
                        }`}
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
                      {timeSlots.map((_, timeIndex) => (
                        <div key={timeIndex} className="h-20 border-b border-white/10"></div>
                      ))}
                      {events
                        .filter((event) => isSameDay(event.startTime, weekDates[dayIndex]))
                        .map((event) => {
                          const eventStyle = calculateEventStyle(event.startTime, event.endTime)
                          return (
                            <div
                              key={event.id}
                              className={`absolute ${event.color} rounded-md p-2 text-white text-xs shadow-md cursor-pointer transition-all duration-200 ease-in-out hover:translate-y-[-2px] hover:shadow-lg`}
                              style={{
                                ...eventStyle,
                                left: "4px",
                                right: "4px",
                              }}
                              onClick={() => handleEventClick(event)}
                            >
                              <div className="font-medium">{event.title}</div>
                              <div className="opacity-80 text-[10px] mt-1">{`${format(event.startTime, "h:mm")} - ${format(event.endTime, "h:mm")}`}</div>
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
                    {timeSlots.map((_, timeIndex) => (
                      <div key={timeIndex} className="h-20 border-b border-white/10"></div>
                    ))}
                    {events
                      .filter((event) => isSameDay(event.startTime, currentDisplayDate))
                      .map((event) => {
                        const eventStyle = calculateEventStyle(event.startTime, event.endTime);
                        return (
                          <div
                            key={event.id}
                            className={`absolute ${event.color} rounded-md p-2 text-white text-xs shadow-md cursor-pointer transition-all duration-200 ease-in-out hover:translate-y-[-2px] hover:shadow-lg`}
                            style={{
                              ...eventStyle,
                              left: "4px",
                              right: "4px",
                            }}
                            onClick={() => handleEventClick(event)}
                          >
                            <div className="font-medium">{event.title}</div>
                            <div className="opacity-80 text-[10px] mt-1">{`${format(event.startTime, "h:mm aa")} - ${format(event.endTime, "h:mm aa")}`}</div>
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
                        }`}
                        onClick={() => {
                            setCurrentDisplayDate(day);
                            setCurrentView('day');
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
                                className={`${event.color} rounded px-1 py-0.5 text-white truncate cursor-pointer hover:opacity-80`}
                                onClick={(e) => { e.stopPropagation(); handleEventClick(event); }}
                              >
                                {event.title}
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

        {/* AI Popup - Remains Commented out */}
        {/* {showAIPopup && (
          <div className="fixed bottom-8 right-8 z-20">
            <div className="w-[450px] relative bg-gradient-to-br from-blue-400/30 via-blue-500/30 to-blue-600/30 backdrop-blur-lg p-6 rounded-2xl shadow-xl border border-blue-300/30 text-white">
              <button
                onClick={() => setShowAIPopup(false)}
                className="absolute top-2 right-2 text-white/70 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <Sparkles className="h-5 w-5 text-blue-300" />
                </div>
                <div className="min-h-[80px]">
                  <p className="text-base font-light">{typedText}</p>
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={togglePlay}
                  className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-sm transition-colors font-medium"
                >
                  Yes
                </button>
                <button
                  onClick={() => setShowAIPopup(false)}
                  className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-sm transition-colors font-medium"
                >
                  No
                </button>
              </div>
              {isPlaying && (
                <div className="mt-4 flex items-center justify-between">
                  <button
                    className="flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-white text-sm hover:bg-white/20 transition-colors"
                    onClick={togglePlay}
                  >
                    <Pause className="h-4 w-4" />
                    <span>Pause Hans Zimmer</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )} */}

        {/* Selected Event Modal - Restored (conditionally rendered by selectedEvent state) */}
        {selectedEvent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"> {/* High z-index for modal */}
            <div className={`${selectedEvent.color} p-6 rounded-lg shadow-xl max-w-md w-full mx-4 text-white`}>
              <h3 className="text-2xl font-bold mb-4">{selectedEvent.title}</h3>
              <div className="space-y-3">
                <p className="flex items-center">
                  <Clock className="mr-2 h-5 w-5" />
                  {`${format(selectedEvent.startTime, "h:mm")} - ${format(selectedEvent.endTime, "h:mm")}`}
                </p>
                <p className="flex items-center">
                  <MapPin className="mr-2 h-5 w-5" />
                  {selectedEvent.location}
                </p>
                <p className="flex items-center">
                  <CalendarIcon className="mr-2 h-5 w-5" />
                  {selectedEvent.startTime ? `${format(selectedEvent.startTime, "EEE, MMM d")} (${format(currentDisplayDate, "MMMM")})` : ""}
                </p>
                <p className="flex items-start">
                  <Users className="mr-2 h-5 w-5 mt-1" />
                  <span>
                    <strong>Attendees:</strong>
                    <br />
                    {selectedEvent.attendees.join(", ") || "No attendees"}
                  </span>
                </p>
                <p>
                  <strong>Organizer:</strong> {selectedEvent.organizer}
                </p>
                <p>
                  <strong>Description:</strong> {selectedEvent.description}
                </p>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  className="bg-white/90 text-gray-800 px-4 py-2 rounded hover:bg-white transition-colors"
                  onClick={() => setSelectedEvent(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Event Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-slate-800 p-6 rounded-lg shadow-xl max-w-lg w-full text-white border border-slate-700">
              <h3 className="text-xl font-semibold mb-6">Create New Event</h3>
              
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
                  onClick={closeCreateModal}
                  className="px-4 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors border border-slate-600"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveEvent}
                  className="px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800"
                >
                  Save Event
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
} 