import React, { useState, useCallback, useRef } from 'react';
import { GoogleMap, Marker, Autocomplete } from '@react-google-maps/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, X, Search } from 'lucide-react';
import { useGoogleMaps } from '@/contexts/GoogleMapsContext';

const mapContainerStyle = {
  width: '100%',
  height: '100%' // Will be controlled by parent container
};

const defaultCenter = {
  lat: 40.7128,
  lng: -74.0060 // New York City default
};

export interface LocationData {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
  address?: string;
}

interface LocationPickerProps {
  initialLocation?: LocationData;
  onLocationSelect: (location: LocationData | null) => void;
  disabled?: boolean;
}

const LocationPicker: React.FC<LocationPickerProps> = ({ 
  initialLocation, 
  onLocationSelect, 
  disabled = false 
}) => {
  const { isLoaded } = useGoogleMaps();
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
    address?: string;
  } | null>(
    initialLocation 
      ? {
          lat: initialLocation.coordinates[1],
          lng: initialLocation.coordinates[0],
          address: initialLocation.address
        }
      : null
  );
  
  const [mapCenter, setMapCenter] = useState(
    initialLocation 
      ? { lat: initialLocation.coordinates[1], lng: initialLocation.coordinates[0] }
      : defaultCenter
  );
  
  const [showMap, setShowMap] = useState(!!initialLocation);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  // Get user's current location
  const getCurrentLocation = useCallback(() => {
    if (navigator.geolocation && !disabled) {
      setIsGettingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            address: 'Current Location'
          };
          setSelectedLocation(location);
          setMapCenter(location);
          setShowMap(true);
          
          // Convert to LocationData format
          const locationData: LocationData = {
            type: 'Point',
            coordinates: [location.lng, location.lat],
            address: location.address
          };
          onLocationSelect(locationData);
          setIsGettingLocation(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          setIsGettingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      );
    }
  }, [disabled, onLocationSelect]);

  // Handle map click
  const handleMapClick = useCallback((event: google.maps.MapMouseEvent) => {
    if (disabled || !event.latLng) return;
    
    const lat = event.latLng.lat();
    const lng = event.latLng.lng();
    
    const location = { lat, lng, address: `${lat.toFixed(6)}, ${lng.toFixed(6)}` };
    setSelectedLocation(location);
    
    // Convert to LocationData format
    const locationData: LocationData = {
      type: 'Point',
      coordinates: [lng, lat],
      address: location.address
    };
    onLocationSelect(locationData);
  }, [disabled, onLocationSelect]);

  // Handle place selection from autocomplete
  const handlePlaceChanged = useCallback(() => {
    if (autocompleteRef.current && !disabled) {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry && place.geometry.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const address = place.formatted_address || place.name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        
        const location = { lat, lng, address };
        setSelectedLocation(location);
        setMapCenter(location);
        setShowMap(true);
        
        // Convert to LocationData format
        const locationData: LocationData = {
          type: 'Point',
          coordinates: [lng, lat],
          address
        };
        onLocationSelect(locationData);
      }
    }
  }, [disabled, onLocationSelect]);

  // Clear location
  const clearLocation = useCallback(() => {
    setSelectedLocation(null);
    setShowMap(false);
    onLocationSelect(null);
  }, [onLocationSelect]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-muted-foreground">
          Location (Optional)
        </label>
        {selectedLocation && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearLocation}
            disabled={disabled}
            className="text-red-500 hover:text-red-600"
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Location selection controls */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={getCurrentLocation}
          disabled={disabled || isGettingLocation}
          className="flex items-center gap-1"
        >
          <Navigation className="h-4 w-4" />
          {isGettingLocation ? 'Getting...' : 'Use Current'}
        </Button>
        
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowMap(!showMap)}
          disabled={disabled}
          className="flex items-center gap-1"
        >
          <MapPin className="h-4 w-4" />
          {showMap ? 'Hide Map' : 'Show Map'}
        </Button>
      </div>

      {/* Address search */}
      {isLoaded && (
        <Autocomplete
          onLoad={(autocomplete) => {
            autocompleteRef.current = autocomplete;
          }}
          onPlaceChanged={handlePlaceChanged}
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search for a location..."
              disabled={disabled}
              className="pl-10"
            />
          </div>
        </Autocomplete>
      )}

        {/* Selected location display */}
        {selectedLocation && (
          <Card className="mt-2">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{selectedLocation.address}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs">
                  Selected
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Map */}
        {showMap && isLoaded && (
          <Card className="mt-3">
            <CardContent className="p-0">
              <div className="h-48 sm:h-56 md:h-64 min-h-[180px] w-full">
                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  center={mapCenter}
                  zoom={selectedLocation ? 15 : 10}
                  onClick={handleMapClick}
                  options={{
                    disableDefaultUI: false,
                    zoomControl: true,
                    streetViewControl: false,
                    mapTypeControl: false,
                    fullscreenControl: false,
                  }}
                >
                {selectedLocation && (
                  <Marker
                    position={selectedLocation}
                    icon={{
                      url: "data:image/svg+xml," + encodeURIComponent(`
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#ef4444">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                        </svg>
                      `),
                      scaledSize: new google.maps.Size(32, 32),
                      anchor: new google.maps.Point(16, 32)
                    }}
                    title={selectedLocation.address}
                  />
                )}
                </GoogleMap>
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  );
};

export default LocationPicker;