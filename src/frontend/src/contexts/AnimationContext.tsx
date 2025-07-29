/**
 * Animation Context Provider
 * Centralized animation configuration and preferences
 * Provides premium animation control across the entire application
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AnimationControls, useAnimation } from 'framer-motion';
import { animationConfig, getAnimationConfig } from '@/utils/animations';

interface AnimationPreferences {
  enableAnimations: boolean;
  respectReducedMotion: boolean;
  animationIntensity: 'minimal' | 'balanced' | 'rich' | 'premium';
  enableHaptics: boolean;
  enableSounds: boolean;
  performanceMode: 'auto' | 'performance' | 'quality';
}

interface AnimationContextType {
  preferences: AnimationPreferences;
  updatePreferences: (updates: Partial<AnimationPreferences>) => void;
  globalControls: AnimationControls;
  isAnimating: boolean;
  performanceMetrics: {
    fps: number;
    frameDrops: number;
    memoryUsage: number;
  };
  
  // Animation orchestration
  orchestratePageTransition: (direction?: 'forward' | 'backward') => Promise<void>;
  orchestrateSuccess: () => Promise<void>;
  orchestrateError: () => Promise<void>;
  orchestrateLoading: (isLoading: boolean) => Promise<void>;
  
  // Device capabilities
  supportsHaptics: boolean;
  supportsWebGL: boolean;
  isHighPerformanceDevice: boolean;
}

const defaultPreferences: AnimationPreferences = {
  enableAnimations: true,
  respectReducedMotion: true,
  animationIntensity: 'balanced',
  enableHaptics: true,
  enableSounds: false,
  performanceMode: 'auto',
};

const AnimationContext = createContext<AnimationContextType | null>(null);

interface AnimationProviderProps {
  children: React.ReactNode;
  initialPreferences?: Partial<AnimationPreferences>;
}

export const AnimationProvider: React.FC<AnimationProviderProps> = ({
  children,
  initialPreferences = {},
}) => {
  const [preferences, setPreferences] = useState<AnimationPreferences>({
    ...defaultPreferences,
    ...initialPreferences,
  });
  
  const [isAnimating, setIsAnimating] = useState(false);
  const [performanceMetrics, setPerformanceMetrics] = useState({
    fps: 60,
    frameDrops: 0,
    memoryUsage: 0,
  });
  
  const globalControls = useAnimation();
  
  // Device capability detection
  const [deviceCapabilities, setDeviceCapabilities] = useState({
    supportsHaptics: false,
    supportsWebGL: false,
    isHighPerformanceDevice: true,
  });

  // Initialize device capabilities
  useEffect(() => {
    const checkCapabilities = () => {
      const supportsHaptics = 'vibrate' in navigator;
      const canvas = document.createElement('canvas');
      const supportsWebGL = !!(
        canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      );
      
      // Rough performance detection based on memory and cores
      const memory = (navigator as any).deviceMemory || 4;
      const cores = navigator.hardwareConcurrency || 4;
      const isHighPerformanceDevice = memory >= 4 && cores >= 4;
      
      setDeviceCapabilities({
        supportsHaptics,
        supportsWebGL,
        isHighPerformanceDevice,
      });
    };
    
    checkCapabilities();
  }, []);

  // Performance monitoring
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animationFrame: number;
    
    const monitorPerformance = (currentTime: number) => {
      frameCount++;
      
      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        const memoryUsage = (performance as any).memory?.usedJSHeapSize || 0;
        
        setPerformanceMetrics(prev => ({
          fps,
          frameDrops: prev.frameDrops + (fps < 55 ? 1 : 0),
          memoryUsage: Math.round(memoryUsage / 1024 / 1024), // MB
        }));
        
        frameCount = 0;
        lastTime = currentTime;
      }
      
      animationFrame = requestAnimationFrame(monitorPerformance);
    };
    
    if (preferences.performanceMode === 'auto' || preferences.performanceMode === 'quality') {
      animationFrame = requestAnimationFrame(monitorPerformance);
    }
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [preferences.performanceMode]);

  // Auto-adjust preferences based on performance
  useEffect(() => {
    if (preferences.performanceMode === 'auto') {
      const { fps, frameDrops } = performanceMetrics;
      
      if (fps < 45 || frameDrops > 10) {
        setPreferences(prev => ({
          ...prev,
          animationIntensity: 'minimal',
          enableHaptics: false,
        }));
      } else if (fps > 55 && frameDrops < 3 && deviceCapabilities.isHighPerformanceDevice) {
        setPreferences(prev => ({
          ...prev,
          animationIntensity: 'premium',
        }));
      }
    }
  }, [performanceMetrics, preferences.performanceMode, deviceCapabilities.isHighPerformanceDevice]);

  // Update preferences
  const updatePreferences = useCallback((updates: Partial<AnimationPreferences>) => {
    setPreferences(prev => ({ ...prev, ...updates }));
  }, []);

  // Haptic feedback helper
  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!preferences.enableHaptics || !deviceCapabilities.supportsHaptics) return;
    
    const patterns = {
      light: 10,
      medium: 50,
      heavy: 100,
    };
    
    navigator.vibrate(patterns[type]);
  }, [preferences.enableHaptics, deviceCapabilities.supportsHaptics]);

  // Animation orchestration methods
  const orchestratePageTransition = useCallback(async (direction: 'forward' | 'backward' = 'forward') => {
    if (!preferences.enableAnimations) return;
    
    setIsAnimating(true);
    triggerHaptic('light');
    
    try {
      await globalControls.start({
        opacity: [1, 0.8, 1],
        scale: [1, 0.98, 1],
        transition: {
          duration: 0.4,
          ease: [0.4, 0, 0.2, 1],
        },
      });
    } finally {
      setIsAnimating(false);
    }
  }, [preferences.enableAnimations, globalControls, triggerHaptic]);

  const orchestrateSuccess = useCallback(async () => {
    if (!preferences.enableAnimations) return;
    
    setIsAnimating(true);
    triggerHaptic('medium');
    
    try {
      await globalControls.start({
        scale: [1, 1.05, 1],
        rotate: [0, 2, -1, 0],
        transition: {
          duration: 0.6,
          ease: [0.68, -0.55, 0.265, 1.55],
        },
      });
    } finally {
      setIsAnimating(false);
    }
  }, [preferences.enableAnimations, globalControls, triggerHaptic]);

  const orchestrateError = useCallback(async () => {
    if (!preferences.enableAnimations) return;
    
    setIsAnimating(true);
    triggerHaptic('heavy');
    
    try {
      await globalControls.start({
        x: [-4, 4, -4, 4, 0],
        scale: [1, 1.02, 1],
        transition: {
          duration: 0.4,
          ease: [0.17, 0.67, 0.83, 0.67],
        },
      });
    } finally {
      setIsAnimating(false);
    }
  }, [preferences.enableAnimations, globalControls, triggerHaptic]);

  const orchestrateLoading = useCallback(async (isLoading: boolean) => {
    if (!preferences.enableAnimations) return;
    
    setIsAnimating(isLoading);
    
    if (isLoading) {
      await globalControls.start({
        opacity: [1, 0.7, 1],
        transition: {
          duration: 1.2,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      });
    } else {
      await globalControls.start({
        opacity: 1,
        transition: {
          duration: 0.3,
        },
      });
    }
  }, [preferences.enableAnimations, globalControls]);

  const contextValue: AnimationContextType = {
    preferences,
    updatePreferences,
    globalControls,
    isAnimating,
    performanceMetrics,
    
    orchestratePageTransition,
    orchestrateSuccess,
    orchestrateError,
    orchestrateLoading,
    
    ...deviceCapabilities,
  };

  return (
    <AnimationContext.Provider value={contextValue}>
      {children}
    </AnimationContext.Provider>
  );
};

export const useAnimationContext = (): AnimationContextType => {
  const context = useContext(AnimationContext);
  if (!context) {
    throw new Error('useAnimationContext must be used within an AnimationProvider');
  }
  return context;
};

// Convenience hooks for common patterns
export const useHapticFeedback = () => {
  const { preferences, supportsHaptics } = useAnimationContext();
  
  return useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!preferences.enableHaptics || !supportsHaptics) return;
    
    const patterns = {
      light: 10,
      medium: 50,
      heavy: 100,
    };
    
    navigator.vibrate(patterns[type]);
  }, [preferences.enableHaptics, supportsHaptics]);
};

export const useAnimationConfig = () => {
  const { preferences } = useAnimationContext();
  
  return getAnimationConfig({
    reducedMotion: preferences.respectReducedMotion && 
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  });
};