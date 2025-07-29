import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Monitor, Zap } from 'lucide-react';

interface Enhanced3DFallbackProps {
  agents: any[];
  error?: Error;
  onRetry?: () => void;
}

export const Enhanced3DFallback: React.FC<Enhanced3DFallbackProps> = ({ 
  agents, 
  error, 
  onRetry 
}) => {
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null);

  useEffect(() => {
    // Check WebGL support
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    setWebglSupported(!!gl);
  }, []);

  const getErrorMessage = () => {
    if (error) {
      return error.message;
    }
    
    if (webglSupported === false) {
      return 'WebGL is not supported in your browser. 3D visualization requires WebGL support.';
    }
    
    return 'Failed to load 3D visualization components.';
  };

  const getSuggestions = () => {
    const suggestions = [];
    
    if (webglSupported === false) {
      suggestions.push('Try updating your browser to the latest version');
      suggestions.push('Enable hardware acceleration in your browser settings');
      suggestions.push('Update your graphics drivers');
    } else {
      suggestions.push('Check your internet connection');
      suggestions.push('Try refreshing the page');
      suggestions.push('Disable browser extensions that might interfere');
    }
    
    return suggestions;
  };

  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-900 to-slate-700 rounded-lg flex items-center justify-center p-8">
      <div className="max-w-md text-center space-y-6">
        <div className="flex justify-center">
          <div className="p-4 bg-red-500/20 rounded-full">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
        </div>
        
        <div>
          <h3 className="text-xl font-semibold text-white mb-2">
            3D Visualization Unavailable
          </h3>
          <p className="text-gray-300 text-sm">
            {getErrorMessage()}
          </p>
        </div>

        <Alert className="bg-yellow-900/20 border-yellow-600 text-left">
          <Monitor className="h-4 w-4" />
          <AlertDescription className="text-yellow-200">
            <div className="space-y-2">
              <div className="font-medium">Troubleshooting steps:</div>
              <ul className="text-sm space-y-1">
                {getSuggestions().map((suggestion, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-yellow-400 mt-1">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          {onRetry && (
            <Button 
              onClick={onRetry}
              variant="outline"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white border-blue-500"
            >
              <Zap className="w-4 h-4 mr-2" />
              Retry Loading 3D View
            </Button>
          )}
          
          <div className="text-xs text-gray-400">
            <div>Browser: {navigator.userAgent.split(' ')[0]}</div>
            <div>WebGL: {webglSupported === null ? 'Checking...' : webglSupported ? 'Supported' : 'Not Supported'}</div>
            <div>Agents: {agents.length}</div>
          </div>
        </div>

        {/* Simple 2D representation */}
        <div className="bg-slate-800/50 rounded-lg p-4">
          <div className="text-sm font-medium text-white mb-3">Agent Overview (2D)</div>
          <div className="grid grid-cols-2 gap-2">
            {agents.slice(0, 6).map((agent, index) => (
              <div 
                key={agent.id || index}
                className="bg-slate-700/50 rounded px-2 py-1 text-xs"
              >
                <div className="text-white font-medium truncate">
                  {agent.name || `Agent ${index + 1}`}
                </div>
                <div className="text-gray-400">
                  {agent.status || 'idle'}
                </div>
              </div>
            ))}
            {agents.length > 6 && (
              <div className="bg-slate-700/30 rounded px-2 py-1 text-xs text-gray-400 flex items-center justify-center">
                +{agents.length - 6} more
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Enhanced3DFallback;