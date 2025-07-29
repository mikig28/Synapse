// Device testing utilities for 3D system
import { detectWebGLSupport, getWebGLInfo } from '../../../utils/webglSupport';

export interface DeviceCapabilities {
  webglSupported: boolean;
  webglVersion: number;
  maxTextureSize: number;
  maxRenderBufferSize: number;
  maxVertexAttributes: number;
  devicePixelRatio: number;
  isMobile: boolean;
  isTablet: boolean;
  supportsTouch: boolean;
  performanceLevel: 'low' | 'medium' | 'high';
  recommendedSettings: {
    enableShadows: boolean;
    enableParticles: boolean;
    enablePostProcessing: boolean;
    maxParticleCount: number;
    shadowMapSize: number;
    pixelRatio: number;
  };
}

// Detect device capabilities
export function detectDeviceCapabilities(): DeviceCapabilities {
  const webglSupported = detectWebGLSupport();
  const webglInfo = getWebGLInfo();
  
  // Device detection
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  const isTablet = /ipad|android(?=.*mobile)|tablet/i.test(userAgent);
  const supportsTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  // Performance estimation based on device characteristics
  let performanceLevel: 'low' | 'medium' | 'high' = 'medium';
  
  if (!webglSupported || !webglInfo) {
    performanceLevel = 'low';
  } else {
    const renderer = webglInfo.renderer?.toLowerCase() || '';
    const vendor = webglInfo.vendor?.toLowerCase() || '';
    
    // High-performance indicators
    if (
      renderer.includes('nvidia') ||
      renderer.includes('geforce') ||
      renderer.includes('radeon') ||
      renderer.includes('amd') ||
      (renderer.includes('intel') && renderer.includes('iris'))
    ) {
      performanceLevel = 'high';
    }
    // Low-performance indicators
    else if (
      isMobile ||
      renderer.includes('software') ||
      renderer.includes('mesa') ||
      (webglInfo.maxTextureSize && webglInfo.maxTextureSize < 4096)
    ) {
      performanceLevel = 'low';
    }
  }
  
  // Determine recommended settings based on capabilities
  const recommendedSettings = {
    enableShadows: performanceLevel === 'high',
    enableParticles: performanceLevel !== 'low',
    enablePostProcessing: performanceLevel === 'high',
    maxParticleCount: performanceLevel === 'high' ? 500 : performanceLevel === 'medium' ? 200 : 50,
    shadowMapSize: performanceLevel === 'high' ? 2048 : performanceLevel === 'medium' ? 1024 : 512,
    pixelRatio: Math.min(
      window.devicePixelRatio,
      performanceLevel === 'high' ? 2 : performanceLevel === 'medium' ? 1.5 : 1
    )
  };
  
  return {
    webglSupported,
    webglVersion: webglInfo?.version || 0,
    maxTextureSize: webglInfo?.maxTextureSize || 0,
    maxRenderBufferSize: webglInfo?.maxRenderBufferSize || 0,
    maxVertexAttributes: webglInfo?.maxVertexAttributes || 0,
    devicePixelRatio: window.devicePixelRatio,
    isMobile,
    isTablet,
    supportsTouch,
    performanceLevel,
    recommendedSettings
  };
}

// Test 3D system performance
export function test3DPerformance(): Promise<{
  averageFPS: number;
  frameTimeVariance: number;
  drawCalls: number;
  triangles: number;
  memoryUsage: number;
  passed: boolean;
}> {
  return new Promise((resolve) => {
    const frameTimes: number[] = [];
    let lastTime = performance.now();
    let frameCount = 0;
    const maxFrames = 60; // Test for 1 second at 60fps
    
    const testFrame = () => {
      const currentTime = performance.now();
      const frameTime = currentTime - lastTime;
      frameTimes.push(frameTime);
      lastTime = currentTime;
      frameCount++;
      
      if (frameCount < maxFrames) {
        requestAnimationFrame(testFrame);
      } else {
        // Calculate results
        const averageFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
        const averageFPS = 1000 / averageFrameTime;
        
        const variance = frameTimes.reduce((acc, time) => {
          const diff = time - averageFrameTime;
          return acc + diff * diff;
        }, 0) / frameTimes.length;
        
        const frameTimeVariance = Math.sqrt(variance);
        
        // Mock other metrics (would need actual WebGL context)
        const drawCalls = 50;
        const triangles = 10000;
        const memoryUsage = (performance as any).memory?.usedJSHeapSize || 0;
        
        // Performance criteria
        const passed = averageFPS >= 30 && frameTimeVariance < 10;
        
        resolve({
          averageFPS,
          frameTimeVariance,
          drawCalls,
          triangles,
          memoryUsage,
          passed
        });
      }
    };
    
    requestAnimationFrame(testFrame);
  });
}

// Automated device testing suite
export async function runDeviceTests(): Promise<{
  capabilities: DeviceCapabilities;
  performance: Awaited<ReturnType<typeof test3DPerformance>>;
  recommendations: {
    use3D: boolean;
    theme: 'studio' | 'cyber' | 'space' | 'minimal';
    performanceMode: 'low' | 'medium' | 'high';
    warnings: string[];
  };
}> {
  console.log('Running 3D device capability tests...');
  
  const capabilities = detectDeviceCapabilities();
  const performance = await test3DPerformance();
  
  // Generate recommendations
  const recommendations = {
    use3D: capabilities.webglSupported && performance.passed,
    theme: capabilities.performanceLevel === 'high' ? 'cyber' as const : 'studio' as const,
    performanceMode: capabilities.performanceLevel,
    warnings: [] as string[]
  };
  
  // Add warnings based on test results
  if (!capabilities.webglSupported) {
    recommendations.warnings.push('WebGL not supported - 3D features disabled');
  }
  
  if (performance.averageFPS < 30) {
    recommendations.warnings.push('Low frame rate detected - consider performance mode');
  }
  
  if (capabilities.isMobile) {
    recommendations.warnings.push('Mobile device detected - touch controls enabled');
  }
  
  if (capabilities.recommendedSettings.maxParticleCount < 100) {
    recommendations.warnings.push('Limited particle support - effects may be reduced');
  }
  
  console.log('Device test results:', {
    capabilities,
    performance,
    recommendations
  });
  
  return {
    capabilities,
    performance,
    recommendations
  };
}

// Utility to apply device-specific optimizations
export function applyDeviceOptimizations(capabilities: DeviceCapabilities) {
  const settings = capabilities.recommendedSettings;
  
  return {
    // Scene configuration
    sceneConfig: {
      theme: capabilities.performanceLevel === 'high' ? 'cyber' : 'studio',
      enableParticles: settings.enableParticles,
      enablePostProcessing: settings.enablePostProcessing,
      enableShadows: settings.enableShadows,
      enableEnvironment: true,
      performanceMode: capabilities.performanceLevel
    },
    
    // Canvas configuration
    canvasConfig: {
      dpr: [1, settings.pixelRatio],
      gl: {
        antialias: capabilities.performanceLevel !== 'low',
        alpha: false,
        powerPreference: capabilities.performanceLevel === 'high' ? 'high-performance' : 'default'
      }
    },
    
    // Control configuration
    controlsConfig: {
      enableTouch: capabilities.supportsTouch,
      enableGestures: capabilities.supportsTouch,
      enableKeyboard: !capabilities.isMobile,
      accessibilityMode: capabilities.isMobile,
      dampingFactor: capabilities.isMobile ? 0.1 : 0.05
    }
  };
}

export default {
  detectDeviceCapabilities,
  test3DPerformance,
  runDeviceTests,
  applyDeviceOptimizations
};