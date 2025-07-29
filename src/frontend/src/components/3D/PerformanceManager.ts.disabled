import { Object3D, Camera, Vector3, Frustum, Matrix4, WebGLRenderer } from 'three';

// Performance quality levels
export type PerformanceLevel = 'low' | 'medium' | 'high' | 'ultra';

// LOD (Level of Detail) configuration
export interface LODConfig {
  high: number;    // Distance threshold for high detail
  medium: number;  // Distance threshold for medium detail
  low: number;     // Distance threshold for low detail
}

// Performance metrics
export interface PerformanceMetrics {
  fps: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  memoryUsage: number;
}

// Performance settings for different quality levels
export interface PerformanceSettings {
  pixelRatio: number;
  shadowMapSize: number;
  antialias: boolean;
  enableShadows: boolean;
  enablePostProcessing: boolean;
  enableParticles: boolean;
  maxParticles: number;
  lodDistanceMultiplier: number;
  cullingEnabled: boolean;
}

// Object pool for efficient memory management
class ObjectPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn: (obj: T) => void;

  constructor(createFn: () => T, resetFn: (obj: T) => void, initialSize = 10) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(createFn());
    }
  }

  get(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return this.createFn();
  }

  release(obj: T): void {
    this.resetFn(obj);
    this.pool.push(obj);
  }

  clear(): void {
    this.pool.length = 0;
  }
}

// Performance manager class
export class PerformanceManager {
  private camera: Camera | null = null;
  private renderer: WebGLRenderer | null = null;
  private objects: Map<string, Object3D> = new Map();
  private lodConfigs: Map<string, LODConfig> = new Map();
  private frustum: Frustum = new Frustum();
  private cameraMatrix: Matrix4 = new Matrix4();
  
  // Performance monitoring
  private frameCount = 0;
  private lastTime = performance.now();
  private currentFPS = 60;
  private performanceLevel: PerformanceLevel = 'high';
  private autoOptimization = true;
  
  // Object pools
  private vector3Pool = new ObjectPool(
    () => new Vector3(),
    (v) => v.set(0, 0, 0)
  );
  
  // Performance callbacks
  private onPerformanceChange?: (level: PerformanceLevel, metrics: PerformanceMetrics) => void;
  private onObjectCulled?: (objectId: string, culled: boolean) => void;

  constructor() {
    this.update = this.update.bind(this);
  }

  // Initialize the performance manager
  initialize(camera: Camera, renderer: WebGLRenderer) {
    this.camera = camera;
    this.renderer = renderer;
    this.applyPerformanceSettings();
  }

  // Register an object for LOD and culling management
  registerObject(
    id: string, 
    object: Object3D, 
    lodConfig?: LODConfig
  ) {
    this.objects.set(id, object);
    
    if (lodConfig) {
      this.lodConfigs.set(id, lodConfig);
    } else {
      // Default LOD configuration
      this.lodConfigs.set(id, {
        high: 10,
        medium: 25,
        low: 50
      });
    }
  }

  // Unregister an object
  unregisterObject(id: string) {
    this.objects.delete(id);
    this.lodConfigs.delete(id);
  }

  // Set performance level manually
  setPerformanceLevel(level: PerformanceLevel) {
    this.performanceLevel = level;
    this.applyPerformanceSettings();
  }

  // Enable/disable auto optimization
  setAutoOptimization(enabled: boolean) {
    this.autoOptimization = enabled;
  }

  // Set performance change callback
  onPerformanceChanged(callback: (level: PerformanceLevel, metrics: PerformanceMetrics) => void) {
    this.onPerformanceChange = callback;
  }

  // Set object culling callback
  onObjectCulling(callback: (objectId: string, culled: boolean) => void) {
    this.onObjectCulled = callback;
  }

  // Main update function - call this every frame
  update() {
    if (!this.camera || !this.renderer) return;

    this.updatePerformanceMetrics();
    this.updateFrustumCulling();
    this.updateLOD();
    
    if (this.autoOptimization) {
      this.autoOptimizePerformance();
    }
  }

  // Update performance metrics
  private updatePerformanceMetrics() {
    this.frameCount++;
    const now = performance.now();
    
    if (now - this.lastTime >= 1000) {
      this.currentFPS = this.frameCount;
      this.frameCount = 0;
      this.lastTime = now;
      
      if (this.onPerformanceChange && this.renderer) {
        const metrics: PerformanceMetrics = {
          fps: this.currentFPS,
          drawCalls: this.renderer.info.render.calls,
          triangles: this.renderer.info.render.triangles,
          geometries: this.renderer.info.memory.geometries,
          textures: this.renderer.info.memory.textures,
          memoryUsage: (performance as any).memory?.usedJSHeapSize || 0
        };
        
        this.onPerformanceChange(this.performanceLevel, metrics);
      }
    }
  }

  // Update frustum culling for all registered objects
  private updateFrustumCulling() {
    if (!this.camera) return;

    // Update frustum from camera
    this.cameraMatrix.multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse
    );
    this.frustum.setFromProjectionMatrix(this.cameraMatrix);

    // Check each object against frustum
    this.objects.forEach((object, id) => {
      const wasVisible = object.visible;
      const inFrustum = this.frustum.intersectsObject(object);
      
      // Only update visibility if culling is enabled and object state changed
      if (this.getPerformanceSettings().cullingEnabled) {
        object.visible = inFrustum;
        
        if (wasVisible !== object.visible && this.onObjectCulled) {
          this.onObjectCulled(id, !object.visible);
        }
      }
    });
  }

  // Update Level of Detail for all registered objects
  private updateLOD() {
    if (!this.camera) return;

    const cameraPosition = this.vector3Pool.get();
    this.camera.getWorldPosition(cameraPosition);

    this.objects.forEach((object, id) => {
      const lodConfig = this.lodConfigs.get(id);
      if (!lodConfig) return;

      const objectPosition = this.vector3Pool.get();
      object.getWorldPosition(objectPosition);
      
      const distance = cameraPosition.distanceTo(objectPosition);
      const adjustedDistance = distance * this.getPerformanceSettings().lodDistanceMultiplier;
      
      // Determine LOD level
      let lodLevel: 'high' | 'medium' | 'low';
      if (adjustedDistance < lodConfig.high) {
        lodLevel = 'high';
      } else if (adjustedDistance < lodConfig.medium) {
        lodLevel = 'medium';
      } else {
        lodLevel = 'low';
      }

      // Apply LOD changes to object
      this.applyLODToObject(object, lodLevel);
      
      // Return vectors to pool
      this.vector3Pool.release(objectPosition);
    });

    this.vector3Pool.release(cameraPosition);
  }

  // Apply LOD changes to a specific object
  private applyLODToObject(object: Object3D, lodLevel: 'high' | 'medium' | 'low') {
    // Store current LOD level in user data
    if (object.userData.currentLOD === lodLevel) return;
    object.userData.currentLOD = lodLevel;

    // Apply LOD-specific optimizations
    object.traverse((child) => {
      if (child.type === 'Mesh') {
        const mesh = child as THREE.Mesh;
        
        switch (lodLevel) {
          case 'high':
            // Full quality
            mesh.visible = true;
            if (mesh.material) {
              (mesh.material as any).wireframe = false;
            }
            break;
            
          case 'medium':
            // Reduced quality
            mesh.visible = true;
            // Could implement simplified materials or geometry here
            break;
            
          case 'low':
            // Basic representation or hidden for small objects
            if (object.userData.hideOnLowLOD) {
              mesh.visible = false;
            } else {
              mesh.visible = true;
              // Could show wireframe or very simple representation
              if (mesh.material && object.userData.allowWireframe) {
                (mesh.material as any).wireframe = true;
              }
            }
            break;
        }
      }
    });
  }

  // Auto-optimize performance based on FPS
  private autoOptimizePerformance() {
    const targetFPS = 30; // Minimum acceptable FPS
    const smoothFPS = 50; // FPS where we can increase quality
    
    if (this.currentFPS < targetFPS) {
      // Performance is poor, reduce quality
      switch (this.performanceLevel) {
        case 'ultra':
          this.setPerformanceLevel('high');
          break;
        case 'high':
          this.setPerformanceLevel('medium');
          break;
        case 'medium':
          this.setPerformanceLevel('low');
          break;
      }
    } else if (this.currentFPS > smoothFPS && this.performanceLevel !== 'ultra') {
      // Performance is good, consider increasing quality
      setTimeout(() => {
        if (this.currentFPS > smoothFPS) {
          switch (this.performanceLevel) {
            case 'low':
              this.setPerformanceLevel('medium');
              break;
            case 'medium':
              this.setPerformanceLevel('high');
              break;
            case 'high':
              this.setPerformanceLevel('ultra');
              break;
          }
        }
      }, 2000); // Wait 2 seconds to ensure stable performance
    }
  }

  // Get performance settings for current level
  private getPerformanceSettings(): PerformanceSettings {
    const settings: Record<PerformanceLevel, PerformanceSettings> = {
      low: {
        pixelRatio: Math.min(window.devicePixelRatio, 1),
        shadowMapSize: 512,
        antialias: false,
        enableShadows: false,
        enablePostProcessing: false,
        enableParticles: false,
        maxParticles: 50,
        lodDistanceMultiplier: 0.5,
        cullingEnabled: true
      },
      medium: {
        pixelRatio: Math.min(window.devicePixelRatio, 1.5),
        shadowMapSize: 1024,
        antialias: true,
        enableShadows: true,
        enablePostProcessing: false,
        enableParticles: true,
        maxParticles: 100,
        lodDistanceMultiplier: 0.7,
        cullingEnabled: true
      },
      high: {
        pixelRatio: Math.min(window.devicePixelRatio, 2),
        shadowMapSize: 2048,
        antialias: true,
        enableShadows: true,
        enablePostProcessing: true,
        enableParticles: true,
        maxParticles: 200,
        lodDistanceMultiplier: 1.0,
        cullingEnabled: true
      },
      ultra: {
        pixelRatio: window.devicePixelRatio,
        shadowMapSize: 4096,
        antialias: true,
        enableShadows: true,
        enablePostProcessing: true,
        enableParticles: true,
        maxParticles: 500,
        lodDistanceMultiplier: 1.5,
        cullingEnabled: false
      }
    };

    return settings[this.performanceLevel];
  }

  // Apply performance settings to renderer
  private applyPerformanceSettings() {
    if (!this.renderer) return;

    const settings = this.getPerformanceSettings();
    
    // Update renderer settings
    this.renderer.setPixelRatio(settings.pixelRatio);
    this.renderer.shadowMap.enabled = settings.enableShadows;
    
    if (settings.enableShadows) {
      // Shadow map size would need to be set during shadow light creation
      // This is just for reference
      console.log(`Shadow map size should be: ${settings.shadowMapSize}`);
    }
  }

  // Get current performance metrics
  getCurrentMetrics(): PerformanceMetrics {
    return {
      fps: this.currentFPS,
      drawCalls: this.renderer?.info.render.calls || 0,
      triangles: this.renderer?.info.render.triangles || 0,
      geometries: this.renderer?.info.memory.geometries || 0,
      textures: this.renderer?.info.memory.textures || 0,
      memoryUsage: (performance as any).memory?.usedJSHeapSize || 0
    };
  }

  // Get current performance level
  getCurrentLevel(): PerformanceLevel {
    return this.performanceLevel;
  }

  // Get current performance settings
  getCurrentSettings(): PerformanceSettings {
    return this.getPerformanceSettings();
  }

  // Cleanup
  dispose() {
    this.objects.clear();
    this.lodConfigs.clear();
    this.vector3Pool.clear();
    this.camera = null;
    this.renderer = null;
  }
}

// Singleton instance
export const performanceManager = new PerformanceManager();

export default PerformanceManager;