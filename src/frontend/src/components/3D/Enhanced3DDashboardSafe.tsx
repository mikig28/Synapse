import React, { useState, useEffect, ErrorBoundary } from 'react';
import { Enhanced3DFallback } from './Enhanced3DFallback';
import { Simple3DTest } from './Simple3DTest';

interface Enhanced3DDashboardSafeProps {
  agents: Array<{
    id: string;
    name: string;
    type: string;
    status: string;
    performance?: {
      tasksCompleted: number;
      successRate: number;
      avgResponseTime: number;
    };
  }>;
  className?: string;
  theme?: 'studio' | 'cyber' | 'space' | 'minimal';
  enableEnhancedFeatures?: boolean;
  enableDataVisualization?: boolean;
  enablePerformanceMonitoring?: boolean;
  enableFormations?: boolean;
  onAgentSelect?: (agentId: string | null) => void;
}

class Enhanced3DErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ComponentType<any>; agents: any[] },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('3D Dashboard Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback;
      return (
        <FallbackComponent 
          agents={this.props.agents}
          error={this.state.error}
          onRetry={() => this.setState({ hasError: false, error: undefined })}
        />
      );
    }

    return this.props.children;
  }
}

export function Enhanced3DDashboardSafe({
  agents = [],
  className = '',
  theme = 'studio',
  enableEnhancedFeatures = true,
  enableDataVisualization = true,
  enablePerformanceMonitoring = true,
  enableFormations = true,
  onAgentSelect
}: Enhanced3DDashboardSafeProps) {
  const [is3DSupported, setIs3DSupported] = useState<boolean | null>(null);
  const [testMode, setTestMode] = useState(true); // Start in test mode

  useEffect(() => {
    // Check WebGL support
    const checkWebGLSupport = () => {
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        const supported = !!gl;
        
        if (supported) {
          // Additional check for WebGL extensions
          const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
          const vendor = gl.getParameter(debugInfo?.UNMASKED_VENDOR_WEBGL || gl.VENDOR);
          const renderer = gl.getParameter(debugInfo?.UNMASKED_RENDERER_WEBGL || gl.RENDERER);
          
          console.log('WebGL Info:', { vendor, renderer });
        }
        
        setIs3DSupported(supported);
        return supported;
      } catch (error) {
        console.error('WebGL check failed:', error);
        setIs3DSupported(false);
        return false;
      }
    };

    checkWebGLSupport();
  }, []);

  // For now, let's use the test component while we debug
  if (testMode || is3DSupported === false) {
    return (
      <div className={`w-full h-full ${className}`}>
        <Enhanced3DErrorBoundary agents={agents} fallback={Enhanced3DFallback}>
          <div className="relative w-full h-full">
            <Simple3DTest agents={agents} />
            
            {/* Debug controls */}
            <div className="absolute top-4 right-4 bg-black/80 rounded-lg p-2 text-xs text-white">
              <div className="space-y-2">
                <div>WebGL: {is3DSupported === null ? 'Checking...' : is3DSupported ? '✓' : '✗'}</div>
                <div>Agents: {agents.length}</div>
                <div>Mode: Test</div>
                <button 
                  onClick={() => setTestMode(!testMode)}
                  className="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-xs"
                >
                  {testMode ? 'Try 3D' : 'Test Mode'}
                </button>
              </div>
            </div>
          </div>
        </Enhanced3DErrorBoundary>
      </div>
    );
  }

  // If 3D is supported and not in test mode, try to load the real 3D component
  if (is3DSupported && !testMode) {
    // Here we would import and use the actual Enhanced3DDashboard
    // But for now, let's still use the test component
    return (
      <div className={`w-full h-full ${className}`}>
        <Enhanced3DErrorBoundary agents={agents} fallback={Enhanced3DFallback}>
          <Simple3DTest agents={agents} />
        </Enhanced3DErrorBoundary>
      </div>
    );
  }

  // Fallback for unsupported browsers
  return (
    <Enhanced3DFallback 
      agents={agents}
      onRetry={() => window.location.reload()}
    />
  );
}

export default Enhanced3DDashboardSafe;