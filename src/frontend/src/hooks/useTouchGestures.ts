/**
 * Advanced Touch Gesture System
 * React Native-style gesture handling for web applications
 */

import { useRef, useCallback, useEffect } from 'react';
import { PanInfo } from 'framer-motion';

export interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
}

export interface SwipeGesture {
  direction: 'left' | 'right' | 'up' | 'down';
  distance: number;
  velocity: number;
  duration: number;
}

export interface LongPressGesture {
  point: TouchPoint;
  duration: number;
}

export interface PullToRefreshGesture {
  distance: number;
  isRefreshing: boolean;
  shouldRefresh: boolean;
}

export interface TouchGestureCallbacks {
  onSwipe?: (gesture: SwipeGesture) => void;
  onLongPress?: (gesture: LongPressGesture) => void;
  onPullToRefresh?: (gesture: PullToRefreshGesture) => void;
  onTap?: (point: TouchPoint) => void;
  onDoubleTap?: (point: TouchPoint) => void;
  onPinch?: (scale: number, center: TouchPoint) => void;
}

export interface TouchGestureConfig {
  swipeThreshold: number;
  longPressThreshold: number;
  pullToRefreshThreshold: number;
  doubleTapThreshold: number;
  pinchThreshold: number;
  enableHapticFeedback: boolean;
  preventScrollOnSwipe: boolean;
}

const defaultConfig: TouchGestureConfig = {
  swipeThreshold: 50,
  longPressThreshold: 500,
  pullToRefreshThreshold: 80,
  doubleTapThreshold: 300,
  pinchThreshold: 0.1,
  enableHapticFeedback: true,
  preventScrollOnSwipe: true,
};

export const useTouchGestures = (
  callbacks: TouchGestureCallbacks,
  config: Partial<TouchGestureConfig> = {}
) => {
  const finalConfig = { ...defaultConfig, ...config };
  
  const gestureState = useRef({
    isPressed: false,
    startPoint: null as TouchPoint | null,
    lastTap: null as TouchPoint | null,
    longPressTimer: null as NodeJS.Timeout | null,
    touches: [] as TouchPoint[],
    isPinching: false,
    lastPinchDistance: 0,
  });

  // Haptic feedback simulation
  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!finalConfig.enableHapticFeedback) return;
    
    // Use Web Vibration API if available
    if ('vibrator' in navigator || 'vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30, 10, 30]
      };
      navigator.vibrate?.(patterns[type]);
    }
  }, [finalConfig.enableHapticFeedback]);

  // Calculate distance between two points
  const getDistance = useCallback((p1: TouchPoint, p2: TouchPoint): number => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }, []);

  // Calculate velocity
  const getVelocity = useCallback((start: TouchPoint, end: TouchPoint): number => {
    const distance = getDistance(start, end);
    const time = end.timestamp - start.timestamp;
    return time > 0 ? distance / time : 0;
  }, [getDistance]);

  // Determine swipe direction
  const getSwipeDirection = useCallback((start: TouchPoint, end: TouchPoint): SwipeGesture['direction'] => {
    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;
    
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      return deltaX > 0 ? 'right' : 'left';
    } else {
      return deltaY > 0 ? 'down' : 'up';
    }
  }, []);

  // Handle touch start
  const handleTouchStart = useCallback((event: TouchEvent) => {
    const touch = event.touches[0];
    const point: TouchPoint = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now(),
    };

    gestureState.current.isPressed = true;
    gestureState.current.startPoint = point;
    gestureState.current.touches = Array.from(event.touches).map(t => ({
      x: t.clientX,
      y: t.clientY,
      timestamp: Date.now(),
    }));

    // Start long press timer
    if (callbacks.onLongPress) {
      gestureState.current.longPressTimer = setTimeout(() => {
        if (gestureState.current.isPressed && gestureState.current.startPoint) {
          triggerHaptic('medium');
          callbacks.onLongPress?.({
            point: gestureState.current.startPoint,
            duration: finalConfig.longPressThreshold,
          });
        }
      }, finalConfig.longPressThreshold);
    }
  }, [callbacks.onLongPress, finalConfig.longPressThreshold, triggerHaptic]);

  // Handle touch move
  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (!gestureState.current.isPressed || !gestureState.current.startPoint) return;

    const touch = event.touches[0];
    const currentPoint: TouchPoint = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now(),
    };

    // Handle pull to refresh
    if (callbacks.onPullToRefresh && gestureState.current.startPoint.y < 100) {
      const deltaY = currentPoint.y - gestureState.current.startPoint.y;
      if (deltaY > 0) {
        const distance = Math.max(0, deltaY);
        const shouldRefresh = distance > finalConfig.pullToRefreshThreshold;
        
        callbacks.onPullToRefresh({
          distance,
          isRefreshing: false,
          shouldRefresh,
        });

        if (shouldRefresh && finalConfig.preventScrollOnSwipe) {
          event.preventDefault();
        }
      }
    }

    // Handle pinch gesture
    if (event.touches.length === 2 && callbacks.onPinch) {
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + 
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );

      if (gestureState.current.lastPinchDistance > 0) {
        const scale = distance / gestureState.current.lastPinchDistance;
        const center: TouchPoint = {
          x: (touch1.clientX + touch2.clientX) / 2,
          y: (touch1.clientY + touch2.clientY) / 2,
          timestamp: Date.now(),
        };

        if (Math.abs(scale - 1) > finalConfig.pinchThreshold) {
          callbacks.onPinch(scale, center);
        }
      }

      gestureState.current.lastPinchDistance = distance;
      gestureState.current.isPinching = true;
    }

    // Cancel long press if moved too far
    if (gestureState.current.longPressTimer) {
      const distance = getDistance(gestureState.current.startPoint, currentPoint);
      if (distance > 10) {
        clearTimeout(gestureState.current.longPressTimer);
        gestureState.current.longPressTimer = null;
      }
    }
  }, [
    callbacks.onPullToRefresh, 
    callbacks.onPinch, 
    finalConfig.pullToRefreshThreshold, 
    finalConfig.pinchThreshold,
    finalConfig.preventScrollOnSwipe,
    getDistance
  ]);

  // Handle touch end
  const handleTouchEnd = useCallback((event: TouchEvent) => {
    if (!gestureState.current.isPressed || !gestureState.current.startPoint) return;

    const touch = event.changedTouches[0];
    const endPoint: TouchPoint = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now(),
    };

    const distance = getDistance(gestureState.current.startPoint, endPoint);
    const duration = endPoint.timestamp - gestureState.current.startPoint.timestamp;

    // Clear long press timer
    if (gestureState.current.longPressTimer) {
      clearTimeout(gestureState.current.longPressTimer);
      gestureState.current.longPressTimer = null;
    }

    // Handle swipe
    if (distance > finalConfig.swipeThreshold && callbacks.onSwipe) {
      const direction = getSwipeDirection(gestureState.current.startPoint, endPoint);
      const velocity = getVelocity(gestureState.current.startPoint, endPoint);
      
      triggerHaptic('light');
      callbacks.onSwipe({
        direction,
        distance,
        velocity,
        duration,
      });
    }
    // Handle tap/double tap
    else if (distance < 10 && duration < 300) {
      const now = Date.now();
      
      // Check for double tap
      if (
        callbacks.onDoubleTap &&
        gestureState.current.lastTap &&
        now - gestureState.current.lastTap.timestamp < finalConfig.doubleTapThreshold &&
        getDistance(gestureState.current.lastTap, endPoint) < 30
      ) {
        triggerHaptic('light');
        callbacks.onDoubleTap(endPoint);
        gestureState.current.lastTap = null;
      } else {
        // Single tap
        gestureState.current.lastTap = endPoint;
        
        // Delay single tap to wait for potential double tap
        setTimeout(() => {
          if (gestureState.current.lastTap === endPoint && callbacks.onTap) {
            callbacks.onTap(endPoint);
          }
        }, finalConfig.doubleTapThreshold);
      }
    }

    // Handle pull to refresh completion
    if (callbacks.onPullToRefresh && gestureState.current.startPoint.y < 100) {
      const deltaY = endPoint.y - gestureState.current.startPoint.y;
      if (deltaY > finalConfig.pullToRefreshThreshold) {
        callbacks.onPullToRefresh({
          distance: deltaY,
          isRefreshing: true,
          shouldRefresh: true,
        });
      }
    }

    // Reset state
    gestureState.current.isPressed = false;
    gestureState.current.startPoint = null;
    gestureState.current.isPinching = false;
    gestureState.current.lastPinchDistance = 0;
  }, [
    callbacks.onSwipe,
    callbacks.onTap,
    callbacks.onDoubleTap,
    callbacks.onPullToRefresh,
    finalConfig.swipeThreshold,
    finalConfig.doubleTapThreshold,
    finalConfig.pullToRefreshThreshold,
    getDistance,
    getSwipeDirection,
    getVelocity,
    triggerHaptic,
  ]);

  // Set up event listeners
  useEffect(() => {
    const element = document.body;
    
    const options: AddEventListenerOptions = {
      passive: !finalConfig.preventScrollOnSwipe,
    };

    element.addEventListener('touchstart', handleTouchStart, options);
    element.addEventListener('touchmove', handleTouchMove, options);
    element.addEventListener('touchend', handleTouchEnd, options);
    element.addEventListener('touchcancel', handleTouchEnd, options);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, finalConfig.preventScrollOnSwipe]);

  return {
    triggerHaptic,
    config: finalConfig,
  };
};

// Framer Motion integration helpers
export const useFramerTouchGestures = (
  callbacks: TouchGestureCallbacks,
  config?: Partial<TouchGestureConfig>
) => {
  const { triggerHaptic } = useTouchGestures(callbacks, config);

  const handlePan = useCallback((event: any, info: PanInfo) => {
    const { offset, velocity, delta } = info;
    
    // Convert to our gesture format
    if (Math.abs(offset.x) > 50 || Math.abs(offset.y) > 50) {
      let direction: SwipeGesture['direction'];
      
      if (Math.abs(offset.x) > Math.abs(offset.y)) {
        direction = offset.x > 0 ? 'right' : 'left';
      } else {
        direction = offset.y > 0 ? 'down' : 'up';
      }

      callbacks.onSwipe?.({
        direction,
        distance: Math.max(Math.abs(offset.x), Math.abs(offset.y)),
        velocity: Math.max(Math.abs(velocity.x), Math.abs(velocity.y)),
        duration: Date.now(), // Approximate
      });
    }
  }, [callbacks]);

  const handleTap = useCallback(() => {
    triggerHaptic('light');
    callbacks.onTap?.({
      x: 0,
      y: 0,
      timestamp: Date.now(),
    });
  }, [callbacks.onTap, triggerHaptic]);

  return {
    onPan: handlePan,
    onTap: handleTap,
    triggerHaptic,
  };
};

// Hook for detecting mobile device capabilities
export const useMobileCapabilities = () => {
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const hasHaptic = 'vibrate' in navigator;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  return {
    hasTouch,
    hasHaptic,
    isStandalone,
    isMobile,
    supportsAdvancedGestures: hasTouch && isMobile,
  };
};