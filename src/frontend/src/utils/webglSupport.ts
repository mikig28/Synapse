export function detectWebGLSupport(): boolean {
  try {
    // Check if we're in a browser environment
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      return false;
    }

    const canvas = document.createElement('canvas');
    
    // Try WebGL2 first
    let gl = canvas.getContext('webgl2');
    if (gl && gl instanceof WebGL2RenderingContext) {
      // Test if WebGL is actually working
      const testRenderer = gl.getParameter(gl.RENDERER);
      const testVersion = gl.getParameter(gl.VERSION);
      
      if (testRenderer && testVersion) {
        console.log('WebGL2 detected:', testRenderer, testVersion);
        return true;
      }
    }
    
    // Fallback to WebGL 1
    const webgl1Context = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    gl = webgl1Context as WebGLRenderingContext;
    if (gl && gl instanceof WebGLRenderingContext) {
      // Test if WebGL is actually working
      const testRenderer = gl.getParameter(gl.RENDERER);
      const testVersion = gl.getParameter(gl.VERSION);
      
      if (testRenderer && testVersion) {
        console.log('WebGL detected:', testRenderer, testVersion);
        return true;
      }
    }
    
    console.warn('WebGL context created but not functional');
    return false;
  } catch (e) {
    console.error('WebGL detection failed:', e);
    return false;
  }
}

export function detectWebGL2Support(): boolean {
  try {
    if (typeof document === 'undefined') {
      return false;
    }
    
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    
    if (gl && gl instanceof WebGL2RenderingContext) {
      // Test if WebGL2 is actually working
      const testRenderer = gl.getParameter(gl.RENDERER);
      const testVersion = gl.getParameter(gl.VERSION);
      return !!(testRenderer && testVersion);
    }
    
    return false;
  } catch (e) {
    console.error('WebGL2 detection failed:', e);
    return false;
  }
}

export function getWebGLInfo() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl || !(gl instanceof WebGLRenderingContext || gl instanceof WebGL2RenderingContext)) {
      return {
        supported: false,
        error: 'No WebGL context available'
      };
    }
    
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    
    return {
      supported: true,
      version: gl.getParameter(gl.VERSION),
      renderer: debugInfo ? gl.getParameter((debugInfo as any).UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
      vendor: debugInfo ? gl.getParameter((debugInfo as any).UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS),
      extensions: gl.getSupportedExtensions()
    };
  } catch (e) {
    return {
      supported: false,
      error: e instanceof Error ? e.message : 'Unknown error'
    };
  }
}