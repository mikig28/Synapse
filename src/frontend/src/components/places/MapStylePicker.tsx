import React from 'react';
import { motion } from 'framer-motion';
import { Palette, Map, Satellite, Navigation2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MapStyle {
  id: string;
  name: string;
  icon: React.ElementType;
  preview: string;
  styles: google.maps.MapTypeStyle[];
}

export const mapStyles: MapStyle[] = [
  {
    id: 'default',
    name: 'Default',
    icon: Map,
    preview: 'bg-gradient-to-br from-blue-400 to-green-400',
    styles: []
  },
  {
    id: 'dark',
    name: 'Dark',
    icon: Navigation2,
    preview: 'bg-gradient-to-br from-gray-800 to-gray-900',
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
    ]
  },
  {
    id: 'retro',
    name: 'Retro',
    icon: Palette,
    preview: 'bg-gradient-to-br from-amber-400 to-orange-600',
    styles: [
      {
        elementType: 'geometry',
        stylers: [{ color: '#ebe3cd' }]
      },
      {
        elementType: 'labels.text.fill',
        stylers: [{ color: '#523735' }]
      },
      {
        elementType: 'labels.text.stroke',
        stylers: [{ color: '#f5f1e6' }]
      },
      {
        featureType: 'road',
        elementType: 'geometry',
        stylers: [{ color: '#f5f1e6' }]
      },
      {
        featureType: 'water',
        elementType: 'geometry',
        stylers: [{ color: '#c9c9c9' }]
      }
    ]
  },
  {
    id: 'satellite',
    name: 'Satellite',
    icon: Satellite,
    preview: 'bg-gradient-to-br from-blue-600 to-purple-600',
    styles: []
  }
];

interface MapStylePickerProps {
  currentStyle: string;
  onStyleChange: (style: MapStyle) => void;
  className?: string;
}

export const MapStylePicker: React.FC<MapStylePickerProps> = ({
  currentStyle,
  onStyleChange,
  className
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className={cn("relative", className)}>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg backdrop-blur-md bg-white/10 dark:bg-black/20 border border-white/20 hover:bg-white/20 transition-colors"
      >
        <Palette className="h-5 w-5 text-white" />
      </motion.button>

      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="absolute bottom-full mb-2 right-0 z-50 p-2 rounded-xl backdrop-blur-md bg-white/90 dark:bg-black/90 border border-white/20 shadow-xl"
          >
            <div className="grid grid-cols-2 gap-2 w-48">
              {mapStyles.map((style) => {
                const Icon = style.icon;
                const isActive = currentStyle === style.id;
                
                return (
                  <motion.button
                    key={style.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      onStyleChange(style);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "relative p-3 rounded-lg overflow-hidden transition-all",
                      isActive 
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-background" 
                        : "hover:ring-1 hover:ring-white/50"
                    )}
                  >
                    <div className={cn("absolute inset-0", style.preview)} />
                    <div className="relative z-10 flex flex-col items-center gap-1">
                      <Icon className="h-5 w-5 text-white drop-shadow-md" />
                      <span className="text-xs font-medium text-white drop-shadow-md">
                        {style.name}
                      </span>
                    </div>
                    {isActive && (
                      <motion.div
                        layoutId="activeMapStyle"
                        className="absolute inset-0 border-2 border-primary rounded-lg"
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
};