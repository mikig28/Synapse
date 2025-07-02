import React, { Component, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ThreeErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Three.js Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || 'Unknown error';
      const isWebGLError = errorMessage.toLowerCase().includes('webgl') || 
                          errorMessage.toLowerCase().includes('context');
      
      return (
        <div className="flex flex-col items-center justify-center h-full p-4 text-center">
          <AlertCircle className="w-8 h-8 text-orange-500 mb-2" />
          <p className="text-sm text-muted-foreground mb-2">
            3D visualization unavailable
          </p>
          <p className="text-xs text-muted-foreground mb-2">
            {isWebGLError ? 'WebGL or Three.js support required' : errorMessage}
          </p>
          
          {isWebGLError && (
            <div className="text-xs text-muted-foreground mb-3 p-2 bg-muted rounded max-w-sm">
              <p><strong>Common solutions:</strong></p>
              <ul className="list-disc list-inside mt-1 space-y-1 text-left">
                <li>Enable hardware acceleration in browser settings</li>
                <li>Update graphics drivers</li>
                <li>Try incognito/private mode</li>
                <li>Use Chrome, Firefox, or Edge browser</li>
              </ul>
            </div>
          )}
          
          <button 
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="mt-2 px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}