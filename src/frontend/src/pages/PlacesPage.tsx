import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard, GlassCardWithGlow } from '@/components/ui/GlassCard';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MapPin, 
  Navigation, 
  Search, 
  Filter, 
  StickyNote, 
  CheckSquare, 
  Calendar,
  List,
  Map as MapIcon,
  Clock,
  Target,
  AlertCircle,
  Edit,
  Sparkles,
  Compass,
  Layers
} from 'lucide-react';
import useAuthStore from '@/store/authStore';
import { formatDistanceToNow } from 'date-fns';
import { locationService } from '@/services/locationService';
import { BACKEND_ROOT_URL } from '@/services/axiosConfig';
import { useGoogleMaps } from '@/contexts/GoogleMapsContext';
import EditTaskModal from '@/components/tasks/EditTaskModal';
import EditNoteModal from '@/components/notes/EditNoteModal';

const mapContainerStyle = {
  width: '100%',
  height: '100%' // Will be controlled by parent container
};

const defaultCenter = {
  lat: 40.7128,
  lng: -74.0060 // New York City default
};

// Task interface for editing
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
  location?: {
    type: 'Point';
    coordinates: [number, number];
    address?: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Note interface for editing
interface Note {
  _id: string;
  title?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  source?: string;
  location?: {
    type: 'Point';
    coordinates: [number, number];
    address?: string;
  };
}

interface GeotaggedItem {
  _id: string;
  title?: string;
  content?: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
    address?: string;
  };
  createdAt: string;
  updatedAt: string;
  itemType: 'note' | 'task';
}

const PlacesPage: React.FC = () => {
  const [geotaggedItems, setGeotaggedItems] = useState<GeotaggedItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<GeotaggedItem | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [searchRadius, setSearchRadius] = useState([1000]); // meters
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'notes' | 'tasks'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('map');
  
  // Edit modal states
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [showEditNoteModal, setShowEditNoteModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  
  const { token } = useAuthStore();
  const { isLoaded } = useGoogleMaps();

  // Fetch all geotagged items
  const fetchGeotaggedItems = useCallback(async () => {
    if (!token) return;

    try {
      setIsLoading(true);
      const [notesResponse, tasksResponse] = await Promise.all([
        fetch(`${BACKEND_ROOT_URL}/api/v1/notes`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${BACKEND_ROOT_URL}/api/v1/tasks`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const notes = await notesResponse.json();
      const tasks = await tasksResponse.json();

      // Filter items that have location data
      const geotaggedNotes = notes
        .filter((note: any) => note.location)
        .map((note: any) => ({ ...note, itemType: 'note' as const }));
      
      const geotaggedTasks = tasks
        .filter((task: any) => task.location)
        .map((task: any) => ({ ...task, itemType: 'task' as const }));

      setGeotaggedItems([...geotaggedNotes, ...geotaggedTasks]);
    } catch (error) {
      console.error('Error fetching geotagged items:', error);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Get user's current location
  const getCurrentLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(location);
          setMapCenter(location);
        },
        (error) => {
          console.error('Error getting location:', error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      );
    }
  }, []);

  // Search for nearby items
  const searchNearby = useCallback(async () => {
    if (!token || !userLocation) return;

    try {
      const radius = searchRadius[0];
      const query = {
        lat: userLocation.lat,
        lng: userLocation.lng,
        radius
      };

      const [nearbyNotes, nearbyTasks] = await Promise.all([
        locationService.getNearbyNotes(query, token),
        locationService.getNearbyTasks(query, token)
      ]);

      const nearbyItems = [
        ...nearbyNotes.map((note: any) => ({ ...note, itemType: 'note' as const })),
        ...nearbyTasks.map((task: any) => ({ ...task, itemType: 'task' as const }))
      ];

      setGeotaggedItems(nearbyItems);
    } catch (error) {
      console.error('Error searching nearby:', error);
    }
  }, [token, userLocation, searchRadius]);

  useEffect(() => {
    fetchGeotaggedItems();
    getCurrentLocation();
  }, [fetchGeotaggedItems, getCurrentLocation]);

  // Filter and search items
  const filteredItems = geotaggedItems.filter(item => {
    const matchesFilter = filter === 'all' || item.itemType === filter.slice(0, -1);
    const matchesSearch = !searchTerm || 
      (item.title?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.content?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.description?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.location.address?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesFilter && matchesSearch;
  });

  // Edit handlers
  const handleEditItem = (item: GeotaggedItem) => {
    if (item.itemType === 'task') {
      setEditingTask(item as Task);
      setShowEditTaskModal(true);
    } else if (item.itemType === 'note') {
      setEditingNote(item as Note);
      setShowEditNoteModal(true);
    }
    setSelectedItem(null); // Close info window
  };

  const handleTaskSave = async (updatedTask: Task) => {
    if (!token || !updatedTask) return;
    
    try {
      const payload = {
        title: updatedTask.title,
        description: updatedTask.description,
        status: updatedTask.status,
        priority: updatedTask.priority,
        location: updatedTask.location,
        dueDate: updatedTask.dueDate,
        reminderEnabled: updatedTask.reminderEnabled,
      };
      
      const response = await fetch(`${BACKEND_ROOT_URL}/api/v1/tasks/${updatedTask._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        // Refresh the items
        fetchGeotaggedItems();
        setShowEditTaskModal(false);
        setEditingTask(null);
      } else {
        console.error('Failed to update task');
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleNoteSave = async (noteData: Omit<Note, '_id' | 'createdAt' | 'updatedAt'>, noteId: string) => {
    if (!token) return;
    
    try {
      const response = await fetch(`${BACKEND_ROOT_URL}/api/v1/notes/${noteId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(noteData)
      });
      
      if (response.ok) {
        // Refresh the items
        fetchGeotaggedItems();
        setShowEditNoteModal(false);
        setEditingNote(null);
      } else {
        console.error('Failed to update note');
      }
    } catch (error) {
      console.error('Error updating note:', error);
    }
  };

  const handleCloseEditModals = () => {
    setShowEditTaskModal(false);
    setShowEditNoteModal(false);
    setEditingTask(null);
    setEditingNote(null);
  };

  const getMarkerIcon = (item: GeotaggedItem) => {
    if (item.itemType === 'note') {
      return {
        url: "data:image/svg+xml," + encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#3b82f6">
            <path d="M20 3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h8v2zm3-4H7v-2h11v2zm0-4H7V7h11v2z"/>
          </svg>
        `),
        scaledSize: new google.maps.Size(32, 32),
        anchor: new google.maps.Point(16, 32)
      };
    } else {
      const color = item.status === 'completed' ? '#10b981' : item.priority === 'high' ? '#ef4444' : '#f59e0b';
      return {
        url: "data:image/svg+xml," + encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="${color}">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
        `),
        scaledSize: new google.maps.Size(32, 32),
        anchor: new google.maps.Point(16, 32)
      };
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/20 text-red-300 border-red-500/50';
      case 'medium': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50';
      case 'low': return 'bg-green-500/20 text-green-300 border-green-500/50';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/20 text-green-300 border-green-500/50';
      case 'in-progress': return 'bg-blue-500/20 text-blue-300 border-blue-500/50';
      case 'pending': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50';
      case 'deferred': return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
    }
  };

  const getItemTypeIcon = (type: string) => {
    return type === 'note' ? (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        <StickyNote className="h-4 w-4 text-blue-500" />
      </motion.div>
    ) : (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        <CheckSquare className="h-4 w-4 text-orange-500" />
      </motion.div>
    );
  };

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -20 }
  };

  const pageTransition = {
    type: 'tween',
    ease: 'anticipate',
    duration: 0.5
  };

  const listItemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: i * 0.05,
        duration: 0.3
      }
    })
  };

  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      className="space-y-6"
    >
      {/* Hero Section with Gradient */}
      <div className="relative overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/10 to-secondary/10 backdrop-blur-3xl" />
        <div className="relative z-10 p-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center justify-between"
          >
            <div>
              <div className="flex items-center gap-3 mb-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                >
                  <Compass className="h-8 w-8 text-primary" />
                </motion.div>
                <h1 className="text-4xl font-bold gradient-text">Places</h1>
              </div>
              <p className="text-muted-foreground text-lg">
                Explore your geotagged memories and tasks on an interactive map
              </p>
            </div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              className="hidden md:flex items-center gap-3"
            >
              <Badge variant="secondary" className="text-sm px-4 py-2 backdrop-blur-md">
                <Sparkles className="h-3 w-3 mr-1" />
                {filteredItems.length} location{filteredItems.length !== 1 ? 's' : ''}
              </Badge>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Mobile Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex md:hidden items-center justify-center"
      >
        <Badge variant="secondary" className="text-sm px-4 py-2">
          <Sparkles className="h-3 w-3 mr-1" />
          {filteredItems.length} location{filteredItems.length !== 1 ? 's' : ''}
        </Badge>
      </motion.div>

      {/* Enhanced Controls */}
      <GlassCardWithGlow className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          >
            <Filter className="h-5 w-5 text-primary" />
          </motion.div>
          <h2 className="text-lg font-semibold">Filters & Search</h2>
        </div>
        
        <div className="space-y-4">
          {/* Enhanced Search */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative"
          >
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search places, notes, tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 backdrop-blur-md bg-white/50 dark:bg-white/10 border-white/20"
            />
            {searchTerm && (
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                ×
              </motion.button>
            )}
          </motion.div>

          <div className="flex flex-wrap gap-3 items-center">
            {/* Animated Filter buttons */}
            <div className="flex gap-2">
              {['all', 'notes', 'tasks'].map((filterType, index) => {
                const Icon = filterType === 'notes' ? StickyNote : filterType === 'tasks' ? CheckSquare : Layers;
                const count = filterType === 'all' 
                  ? geotaggedItems.length 
                  : geotaggedItems.filter(i => i.itemType === filterType.slice(0, -1)).length;
                
                return (
                  <motion.div
                    key={filterType}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                  >
                    <AnimatedButton
                      variant={filter === filterType ? 'gradient' : 'outline'}
                      size="sm"
                      onClick={() => setFilter(filterType as any)}
                    >
                      {filterType !== 'all' && <Icon className="h-4 w-4 mr-1" />}
                      {filterType.charAt(0).toUpperCase() + filterType.slice(1)} ({count})
                    </AnimatedButton>
                  </motion.div>
                );
              })}
            </div>

            {/* Location controls with animations */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="flex gap-2"
            >
              <AnimatedButton
                variant="ghost"
                size="sm"
                onClick={getCurrentLocation}
                className="group"
              >
                <Navigation className="h-4 w-4 mr-1 group-hover:animate-pulse" />
                Find Me
              </AnimatedButton>

              {userLocation && (
                <AnimatedButton
                  variant="ghost"
                  size="sm"
                  onClick={searchNearby}
                >
                  <Search className="h-4 w-4 mr-1" />
                  Nearby
                </AnimatedButton>
              )}

              <AnimatedButton
                variant="ghost"
                size="sm"
                onClick={fetchGeotaggedItems}
              >
                Show All
              </AnimatedButton>
            </motion.div>
          </div>

          {/* Enhanced Search radius */}
          <AnimatePresence>
            {userLocation && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-2 overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Compass className="h-4 w-4 text-muted-foreground" />
                    Search Radius
                  </label>
                  <span className="text-sm font-semibold text-primary">
                    {searchRadius[0]}m
                  </span>
                </div>
                <Slider
                  value={searchRadius}
                  onValueChange={setSearchRadius}
                  max={5000}
                  min={100}
                  step={100}
                  className="w-full"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </GlassCardWithGlow>

      {/* Enhanced Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 p-1 bg-white/10 dark:bg-white/5 backdrop-blur-md">
          <TabsTrigger
            value="map"
            className="flex items-center gap-2 data-[state=active]:bg-white/20 dark:data-[state=active]:bg-white/10"
          >
            <MapIcon className="h-4 w-4" />
            Map View
          </TabsTrigger>
          <TabsTrigger
            value="list"
            className="flex items-center gap-2 data-[state=active]:bg-white/20 dark:data-[state=active]:bg-white/10"
          >
            <List className="h-4 w-4" />
            List View
          </TabsTrigger>
        </TabsList>

        {/* Enhanced Map View */}
        <TabsContent value="map" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <GlassCard className="p-0 overflow-hidden">
              <div className="h-[60vh] min-h-[400px] w-full relative">
                {isLoaded ? (
                  <>
                    <GoogleMap
                      mapContainerStyle={mapContainerStyle}
                      center={mapCenter}
                      zoom={13}
                      onClick={() => setSelectedItem(null)}
                      options={{
                        styles: [
                          {
                            featureType: "all",
                            elementType: "geometry",
                            stylers: [{ color: "#242f3e" }]
                          },
                          {
                            featureType: "all",
                            elementType: "labels.text.stroke",
                            stylers: [{ lightness: -80 }]
                          },
                          {
                            featureType: "administrative",
                            elementType: "labels.text.fill",
                            stylers: [{ color: "#746855" }]
                          },
                          {
                            featureType: "road",
                            elementType: "geometry.fill",
                            stylers: [{ color: "#38414e" }]
                          },
                          {
                            featureType: "road",
                            elementType: "geometry.stroke",
                            stylers: [{ color: "#212a37" }]
                          },
                          {
                            featureType: "water",
                            elementType: "geometry",
                            stylers: [{ color: "#17263c" }]
                          }
                        ],
                        disableDefaultUI: false,
                        zoomControl: true,
                        mapTypeControl: false,
                        scaleControl: true,
                        streetViewControl: false,
                        rotateControl: false,
                        fullscreenControl: true
                      }}
                    >
                      {/* User location marker with pulsing effect */}
                      {userLocation && (
                        <>
                          <div className="absolute inset-0 pointer-events-none">
                            <div
                              className="absolute w-24 h-24 rounded-full bg-primary/20 animate-ping"
                              style={{
                                left: '50%',
                                top: '50%',
                                transform: 'translate(-50%, -50%)'
                              }}
                            />
                          </div>
                          <Marker
                            position={userLocation}
                            icon={{
                              url: "data:image/svg+xml," + encodeURIComponent(`
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#6366f1">
                                  <circle cx="12" cy="12" r="10"/>
                                  <circle cx="12" cy="12" r="3" fill="white"/>
                                </svg>
                              `),
                              scaledSize: new google.maps.Size(32, 32),
                              anchor: new google.maps.Point(16, 16)
                            }}
                            title="Your Location"
                          />
                        </>
                      )}

                      {/* Item markers */}
                      {filteredItems.map((item) => (
                        <Marker
                          key={item._id}
                          position={{
                            lat: item.location.coordinates[1],
                            lng: item.location.coordinates[0]
                          }}
                          icon={getMarkerIcon(item)}
                          onClick={() => setSelectedItem(item)}
                        />
                      ))}

                      {/* Enhanced Info window */}
                      {selectedItem && (
                        <InfoWindow
                          position={{
                            lat: selectedItem.location.coordinates[1],
                            lng: selectedItem.location.coordinates[0]
                          }}
                          onCloseClick={() => setSelectedItem(null)}
                        >
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="p-4 max-w-xs bg-white dark:bg-gray-800 rounded-lg shadow-xl"
                            style={{ 
                              minWidth: '280px',
                              backgroundColor: 'rgba(255, 255, 255, 0.98)',
                              color: '#1f2937'
                            }}
                          >
                            <div className="flex items-center gap-2 mb-3">
                              {getItemTypeIcon(selectedItem.itemType)}
                              <Badge 
                                variant="outline" 
                                className="text-xs border-gray-300 text-gray-700"
                              >
                                {selectedItem.itemType}
                              </Badge>
                              {selectedItem.itemType === 'task' && selectedItem.status && (
                                <Badge
                                  className={`text-xs ${
                                    selectedItem.status === 'completed' 
                                      ? 'bg-green-100 text-green-800 border-green-200' 
                                      : selectedItem.status === 'in-progress'
                                      ? 'bg-blue-100 text-blue-800 border-blue-200'
                                      : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                                  }`}
                                >
                                  {selectedItem.status}
                                </Badge>
                              )}
                            </div>
                            
                            <h3 className="font-semibold mb-2 text-gray-900 text-lg">
                              {selectedItem.title || 'Untitled'}
                            </h3>
                            
                            <p className="text-sm text-gray-600 mb-3 line-clamp-3">
                              {selectedItem.content || selectedItem.description || 'No description'}
                            </p>

                            {selectedItem.location.address && (
                              <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                                <MapPin className="h-3 w-3" />
                                <span>{selectedItem.location.address}</span>
                              </div>
                            )}
                            
                            <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Calendar className="h-3 w-3" />
                                <span>{formatDistanceToNow(new Date(selectedItem.createdAt), { addSuffix: true })}</span>
                              </div>
                              <AnimatedButton
                                variant="primary"
                                size="sm"
                                onClick={() => handleEditItem(selectedItem)}
                                className="bg-blue-500 hover:bg-blue-600 text-white"
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                Edit
                              </AnimatedButton>
                            </div>
                          </motion.div>
                        </InfoWindow>
                      )}
                    </GoogleMap>

                    {/* Map Legend */}
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 }}
                      className="absolute bottom-4 left-4 p-3 rounded-lg backdrop-blur-sm shadow-lg"
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        border: '1px solid rgba(0, 0, 0, 0.1)'
                      }}
                    >
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-primary" />
                          <span className="text-gray-800 font-medium">Your Location</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <StickyNote className="h-3 w-3 text-blue-500" />
                          <span className="text-gray-800 font-medium">Notes</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckSquare className="h-3 w-3 text-orange-500" />
                          <span className="text-gray-800 font-medium">Tasks</span>
                        </div>
                      </div>
                    </motion.div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full bg-muted/20">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center"
                    >
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full mx-auto mb-4"
                      />
                      <p className="text-muted-foreground">Loading interactive map...</p>
                    </motion.div>
                  </div>
                )}
              </div>
            </GlassCard>
          </motion.div>
        </TabsContent>

        {/* Enhanced List View */}
        <TabsContent value="list" className="space-y-4">
          {isLoading ? (
            <div className="grid gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <GlassCard key={i} className="p-6">
                  <div className="animate-pulse space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 bg-muted rounded-full" />
                      <div className="h-4 bg-muted rounded w-24" />
                      <div className="h-4 bg-muted rounded w-16" />
                    </div>
                    <div className="h-5 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-full" />
                    <div className="h-4 bg-muted rounded w-2/3" />
                    <div className="flex items-center justify-between">
                      <div className="h-3 bg-muted rounded w-32" />
                      <div className="h-8 bg-muted rounded w-20" />
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <GlassCard className="text-center py-16">
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <MapPin className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                </motion.div>
                <h3 className="text-xl font-semibold mb-2">No locations found</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  {searchTerm || filter !== 'all' 
                    ? 'Try adjusting your search criteria or filters.'
                    : 'Start adding locations to your notes and tasks to see them here.'
                  }
                </p>
              </GlassCard>
            </motion.div>
          ) : (
            <div className="grid gap-4">
              {filteredItems.map((item, index) => (
                <motion.div
                  key={item._id}
                  custom={index}
                  initial="hidden"
                  animate="visible"
                  variants={listItemVariants}
                >
                  <GlassCardWithGlow className="hover:shadow-2xl transition-all duration-300">
                    <div className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            {getItemTypeIcon(item.itemType)}
                            <Badge variant="outline" className="text-xs">
                              {item.itemType}
                            </Badge>
                            {item.itemType === 'task' && item.status && (
                              <Badge className={`text-xs ${getStatusColor(item.status)}`}>
                                {item.status}
                              </Badge>
                            )}
                            {item.itemType === 'task' && item.priority && (
                              <Badge className={`text-xs ${getPriorityColor(item.priority)}`}>
                                {item.priority}
                              </Badge>
                            )}
                          </div>
                          
                          <h3 className="font-semibold text-xl">
                            {item.title || 'Untitled'}
                          </h3>
                          
                          <p className="text-muted-foreground line-clamp-2">
                            {item.content || item.description || 'No description'}
                          </p>
                          
                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              className="flex items-center gap-1 cursor-pointer"
                              onClick={() => {
                                setMapCenter({
                                  lat: item.location.coordinates[1],
                                  lng: item.location.coordinates[0]
                                });
                                setSelectedItem(item);
                                setActiveTab('map');
                              }}
                            >
                              <MapPin className="h-3 w-3" />
                              <span className="hover:text-primary transition-colors">
                                {item.location.address || `${item.location.coordinates[1].toFixed(4)}, ${item.location.coordinates[0].toFixed(4)}`}
                              </span>
                            </motion.div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                            </div>
                            {item.itemType === 'task' && item.dueDate && (
                              <div className="flex items-center gap-1">
                                <Target className="h-3 w-3" />
                                Due {formatDistanceToNow(new Date(item.dueDate), { addSuffix: true })}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex gap-2 flex-shrink-0">
                          <AnimatedButton
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditItem(item)}
                          >
                            <Edit className="h-4 w-4" />
                          </AnimatedButton>
                          <AnimatedButton
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setMapCenter({
                                lat: item.location.coordinates[1],
                                lng: item.location.coordinates[0]
                              });
                              setSelectedItem(item);
                              setActiveTab('map');
                            }}
                          >
                            <MapIcon className="h-4 w-4" />
                          </AnimatedButton>
                        </div>
                      </div>
                    </div>
                  </GlassCardWithGlow>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Edit Modals */}
      <AnimatePresence>
        {showEditTaskModal && editingTask && (
          <EditTaskModal
            isOpen={showEditTaskModal}
            task={editingTask}
            onClose={handleCloseEditModals}
            onSave={handleTaskSave}
          />
        )}
        
        {showEditNoteModal && editingNote && (
          <EditNoteModal
            isOpen={showEditNoteModal}
            note={editingNote}
            onClose={handleCloseEditModals}
            onSave={handleNoteSave}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default PlacesPage;