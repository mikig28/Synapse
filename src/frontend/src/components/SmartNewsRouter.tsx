import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useDeviceDetection } from '@/hooks/useMobileFeatures';
import NewsPageFixed from '@/pages/NewsPageFixed';
import MobileNewsPageOptimized from '@/pages/MobileNewsPageOptimized';

const SmartNewsRouter: React.FC = () => {
  const { isMobile, isTablet } = useDeviceDetection();
  
  // Log device detection for debugging
  useEffect(() => {
    console.log('📱 Device Detection:', {
      isMobile,
      isTablet,
      userAgent: navigator.userAgent,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
    });
  }, [isMobile, isTablet]);
  
  // Use optimized mobile version for mobile and tablet devices
  if (isMobile || isTablet) {
    return <MobileNewsPageOptimized />;
  }
  
  // Use desktop version for larger screens
  return <NewsPageFixed />;
};

export default SmartNewsRouter;