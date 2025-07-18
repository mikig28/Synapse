import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';
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
  Edit
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Places</h1>
          <p className="text-muted-foreground">
            All your geotagged notes and tasks in one place
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm">
            {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search places, notes, tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex flex-wrap gap-4 items-center">
            {/* Filter buttons */}
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                All ({geotaggedItems.length})
              </Button>
              <Button
                variant={filter === 'notes' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('notes')}
                className="flex items-center gap-1"
              >
                <StickyNote className="h-4 w-4" />
                Notes ({geotaggedItems.filter(i => i.itemType === 'note').length})
              </Button>
              <Button
                variant={filter === 'tasks' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('tasks')}
                className="flex items-center gap-1"
              >
                <CheckSquare className="h-4 w-4" />
                Tasks ({geotaggedItems.filter(i => i.itemType === 'task').length})
              </Button>
            </div>

            {/* Location controls */}
            <Button
              variant="outline"
              size="sm"
              onClick={getCurrentLocation}
              className="flex items-center gap-1"
            >
              <Navigation className="h-4 w-4" />
              Find Me
            </Button>

            {userLocation && (
              <Button
                variant="outline"
                size="sm"
                onClick={searchNearby}
                className="flex items-center gap-1"
              >
                <Search className="h-4 w-4" />
                Search Nearby
              </Button>
            )}

            {/* Reset to all */}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchGeotaggedItems}
              className="flex items-center gap-1"
            >
              Show All
            </Button>
          </div>

          {/* Search radius */}
          {userLocation && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Search Radius: {searchRadius[0]}m
              </label>
              <Slider
                value={searchRadius}
                onValueChange={setSearchRadius}
                max={5000}
                min={100}
                step={100}
                className="w-60"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="map" className="flex items-center gap-2">
            <MapIcon className="h-4 w-4" />
            Map View
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            List View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="map" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <div className="h-64 sm:h-80 md:h-96 min-h-[200px] w-full">
                {isLoaded ? (
                  <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    center={mapCenter}
                    zoom={13}
                    onClick={() => setSelectedItem(null)}
                  >
                  {/* User location marker */}
                  {userLocation && (
                    <Marker
                      position={userLocation}
                      icon={{
                        url: "data:image/svg+xml," + encodeURIComponent(`
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#ef4444">
                            <circle cx="12" cy="12" r="10"/>
                            <circle cx="12" cy="12" r="3" fill="white"/>
                          </svg>
                        `),
                        scaledSize: new google.maps.Size(24, 24),
                        anchor: new google.maps.Point(12, 12)
                      }}
                      title="Your Location"
                    />
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

                  {/* Info window */}
                  {selectedItem && (
                    <InfoWindow
                      position={{
                        lat: selectedItem.location.coordinates[1],
                        lng: selectedItem.location.coordinates[0]
                      }}
                      onCloseClick={() => setSelectedItem(null)}
                    >
                      <div className="p-3 max-w-xs bg-white rounded-lg shadow-lg" style={{ color: '#374151' }}>
                        <div className="flex items-center gap-2 mb-2">
                          {selectedItem.itemType === 'note' ? (
                            <StickyNote className="h-4 w-4 text-blue-500" />
                          ) : (
                            <CheckSquare className="h-4 w-4 text-orange-500" />
                          )}
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md font-medium">
                            {selectedItem.itemType}
                          </span>
                          {selectedItem.itemType === 'task' && selectedItem.status && (
                            <span className={`px-2 py-1 text-xs rounded-md font-medium ${
                              selectedItem.status === 'completed' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {selectedItem.status}
                            </span>
                          )}
                        </div>
                        
                        <h3 className="font-semibold mb-2 text-gray-900 text-sm">
                          {selectedItem.title || 'Untitled'}
                        </h3>
                        
                        <p className="text-xs text-gray-600 mb-3" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {selectedItem.content || selectedItem.description || 'No description'}
                        </p>
                        
                        <div className="flex items-center justify-between border-t pt-2" style={{ borderColor: '#e5e7eb' }}>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDistanceToNow(new Date(selectedItem.createdAt), { addSuffix: true })}</span>
                          </div>
                          <button
                            onClick={() => handleEditItem(selectedItem)}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                          >
                            <Edit className="h-3 w-3" />
                            Edit
                          </button>
                        </div>
                      </div>
                    </InfoWindow>
                  )}
                  </GoogleMap>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                      <p className="text-muted-foreground">Loading Google Maps...</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list" className="space-y-4">
          {isLoading ? (
            <div className="grid gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="p-4">
                  <div className="animate-pulse space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                    <div className="h-3 bg-muted rounded w-1/4"></div>
                  </div>
                </Card>
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No geotagged items found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || filter !== 'all' 
                    ? 'Try adjusting your search or filters.'
                    : 'Start adding locations to your notes and tasks to see them here.'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredItems.map((item) => (
                <Card key={item._id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          {item.itemType === 'note' ? (
                            <StickyNote className="h-4 w-4 text-blue-500" />
                          ) : (
                            <CheckSquare className="h-4 w-4 text-orange-500" />
                          )}
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
                        
                        <h3 className="font-semibold text-lg">
                          {item.title || 'Untitled'}
                        </h3>
                        
                        <p className="text-muted-foreground">
                          {item.content || item.description || 'No description'}
                        </p>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {item.location.address || `${item.location.coordinates[1].toFixed(4)}, ${item.location.coordinates[0].toFixed(4)}`}
                          </div>
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
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditItem(item)}
                          className="flex items-center gap-1"
                        >
                          <Edit className="h-3 w-3" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setMapCenter({
                              lat: item.location.coordinates[1],
                              lng: item.location.coordinates[0]
                            });
                            setSelectedItem(item);
                            setActiveTab('map');
                          }}
                          className="flex items-center gap-1"
                        >
                          <MapIcon className="h-3 w-3" />
                          View on Map
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Edit Modals */}
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
    </div>
  );
};

export default PlacesPage;