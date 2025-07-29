import { useEffect, useState, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Object3D } from 'three';
import { 
  PerformanceManager, 
  performanceManager, 
  PerformanceLevel, 
  PerformanceMetrics,
  LODConfig 
} from '../PerformanceManager';

interface UsePerformanceManagerOptions {
  autoOptimization?: boolean;
  initialLevel?: PerformanceLevel;
  onPerformanceChange?: (level: PerformanceLevel, metrics: PerformanceMetrics) => void;
  onObjectCulled?: (objectId: string, culled: boolean) => void;
}

interface PerformanceManagerHook {
  performanceLevel: PerformanceLevel;
  metrics: PerformanceMetrics;
  setPerformanceLevel: (level: PerformanceLevel) => void;
  registerObject: (id: string, object: Object3D, lodConfig?: LODConfig) => void;
  unregisterObject: (id: string) => void;
  setAutoOptimization: (enabled: boolean) => void;
  isInitialized: boolean;
}

export function usePerformanceManager(options: UsePerformanceManagerOptions = {}): PerformanceManagerHook {
  const { camera, gl } = useThree();
  const [performanceLevel, setPerformanceLevelState] = useState<PerformanceLevel>(
    options.initialLevel || 'high'
  );
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    drawCalls: 0,
    triangles: 0,
    geometries: 0,
    textures: 0,
    memoryUsage: 0
  });
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize performance manager
  useEffect(() => {
    if (camera && gl && !isInitialized) {
      performanceManager.initialize(camera, gl);
      
      // Set up callbacks
      performanceManager.onPerformanceChanged((level, newMetrics) => {
        setPerformanceLevelState(level);
        setMetrics(newMetrics);
        options.onPerformanceChange?.(level, newMetrics);
      });

      if (options.onObjectCulled) {
        performanceManager.onObjectCulling(options.onObjectCulled);
      }

      // Set initial configuration
      if (options.initialLevel) {
        performanceManager.setPerformanceLevel(options.initialLevel);
      }

      if (options.autoOptimization !== undefined) {
        performanceManager.setAutoOptimization(options.autoOptimization);
      }

      setIsInitialized(true);
    }
  }, [camera, gl, isInitialized, options]);

  // Update performance manager every frame
  useFrame(() => {
    if (isInitialized) {
      performanceManager.update();
    }
  });

  // Register object for performance management
  const registerObject = useCallback((id: string, object: Object3D, lodConfig?: LODConfig) => {
    if (isInitialized) {
      performanceManager.registerObject(id, object, lodConfig);
    }
  }, [isInitialized]);

  // Unregister object
  const unregisterObject = useCallback((id: string) => {
    if (isInitialized) {
      performanceManager.unregisterObject(id);
    }
  }, [isInitialized]);

  // Set performance level
  const setPerformanceLevel = useCallback((level: PerformanceLevel) => {
    if (isInitialized) {
      performanceManager.setPerformanceLevel(level);
      setPerformanceLevelState(level);
    }
  }, [isInitialized]);

  // Set auto optimization
  const setAutoOptimization = useCallback((enabled: boolean) => {
    if (isInitialized) {
      performanceManager.setAutoOptimization(enabled);
    }
  }, [isInitialized]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      performanceManager.dispose();
    };
  }, []);

  return {
    performanceLevel,
    metrics,
    setPerformanceLevel,
    registerObject,
    unregisterObject,
    setAutoOptimization,
    isInitialized
  };
}

// Hook for registering individual objects with performance management
export function usePerformanceObject(
  id: string,
  object: Object3D | null,
  lodConfig?: LODConfig
) {
  const { registerObject, unregisterObject } = usePerformanceManager();

  useEffect(() => {
    if (object) {
      registerObject(id, object, lodConfig);
      
      return () => {
        unregisterObject(id);
      };
    }
  }, [id, object, lodConfig, registerObject, unregisterObject]);
}

export default usePerformanceManager;