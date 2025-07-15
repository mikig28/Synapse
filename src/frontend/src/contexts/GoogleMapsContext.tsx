import React, { createContext, useContext, useEffect, useState } from 'react';
import { LoadScript } from '@react-google-maps/api';

const libraries: ("places")[] = ["places"];

interface GoogleMapsContextType {
  isLoaded: boolean;
}

const GoogleMapsContext = createContext<GoogleMapsContextType>({ isLoaded: false });

export const useGoogleMaps = () => {
  const context = useContext(GoogleMapsContext);
  if (!context) {
    throw new Error('useGoogleMaps must be used within a GoogleMapsProvider');
  }
  return context;
};

interface GoogleMapsProviderProps {
  children: React.ReactNode;
}

export const GoogleMapsProvider: React.FC<GoogleMapsProviderProps> = ({ children }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = (error: Error) => {
    console.error('Google Maps failed to load:', error);
  };

  return (
    <LoadScript
      googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
      libraries={libraries}
      onLoad={handleLoad}
      onError={handleError}
      preventGoogleFontsLoading={true}
    >
      <GoogleMapsContext.Provider value={{ isLoaded }}>
        {children}
      </GoogleMapsContext.Provider>
    </LoadScript>
  );
};