import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertTriangle,
  CheckCircle,
  WifiOff,
  Database,
  Zap,
  Activity,
  RefreshCw,
  Settings,
  Loader2,
  ExternalLink,
  Info
} from 'lucide-react';
import { agentService } from '@/services/agentService';

interface HealthStatus {
  database: 'connected' | 'disconnected' | 'checking';
  backend: 'connected' | 'disconnected' | 'checking';
  crewaiService: 'connected' | 'disconnected' | 'checking';
  socketio: 'connected' | 'disconnected' | 'checking';
  lastChecked: Date;
}

interface DashboardHealthCheckProps {
  onHealthChange?: (isHealthy: boolean) => void;
}

export const DashboardHealthCheck: React.FC<DashboardHealthCheckProps> = ({
  onHealthChange
}) => {
  const [health, setHealth] = useState<HealthStatus>({
    database: 'checking',
    backend: 'checking',
    crewaiService: 'checking',
    socketio: 'checking',
    lastChecked: new Date()
  });
  const [isChecking, setIsChecking] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const isHealthy = Object.values(health).every(status => 
      status === 'connected' || status instanceof Date
    );
    onHealthChange?.(isHealthy);
  }, [health, onHealthChange]);

  const checkHealth = async () => {
    setIsChecking(true);
    
    const newHealth: HealthStatus = {
      database: 'checking',
      backend: 'checking', 
      crewaiService: 'checking',
      socketio: 'checking',
      lastChecked: new Date()
    };

    try {
      // Check backend connection
      const response = await fetch('/api/v1/health', { 
        method: 'GET',
        timeout: 5000 
      });
      newHealth.backend = response.ok ? 'connected' : 'disconnected';
      
      if (response.ok) {
        const healthData = await response.json();
        newHealth.database = healthData.database ? 'connected' : 'disconnected';
        newHealth.crewaiService = healthData.crewaiService ? 'connected' : 'disconnected';
      }
    } catch (error) {
      newHealth.backend = 'disconnected';
      newHealth.database = 'disconnected';
      newHealth.crewaiService = 'disconnected';
    }

    // Check Socket.IO connection
    try {
      // This would need to be implemented based on your socket service
      newHealth.socketio = 'connected'; // Placeholder
    } catch (error) {
      newHealth.socketio = 'disconnected';
    }

    setHealth(newHealth);
    setIsChecking(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'disconnected':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'checking':
        return <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />;
      default:
        return <WifiOff className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'disconnected':
        return 'bg-red-100 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'checking':
        return 'bg-yellow-100 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      default:
        return 'bg-gray-100 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800';
    }
  };

  const healthyCount = Object.values(health).filter(status => status === 'connected').length;
  const totalChecks = 4;
  const overallHealth = healthyCount / totalChecks;

  const issues = Object.entries(health)
    .filter(([key, status]) => status === 'disconnected' && key !== 'lastChecked')
    .map(([key]) => key);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Main Health Status */}
      <Card className={overallHealth === 1 ? 'border-green-200' : overallHealth > 0.5 ? 'border-yellow-200' : 'border-red-200'}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${overallHealth === 1 ? 'bg-green-100' : overallHealth > 0.5 ? 'bg-yellow-100' : 'bg-red-100'}`}>
                <Activity className={`w-5 h-5 ${overallHealth === 1 ? 'text-green-600' : overallHealth > 0.5 ? 'text-yellow-600' : 'text-red-600'}`} />
              </div>
              <div>
                <CardTitle className="text-lg">Dashboard Health</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {healthyCount}/{totalChecks} services connected
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={overallHealth === 1 ? 'default' : overallHealth > 0.5 ? 'secondary' : 'destructive'}>
                {overallHealth === 1 ? 'Healthy' : overallHealth > 0.5 ? 'Partial' : 'Unhealthy'}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={checkHealth}
                disabled={isChecking}
              >
                {isChecking ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Quick Status Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className={`p-3 rounded-lg border ${getStatusColor(health.backend)}`}>
              <div className="flex items-center gap-2">
                {getStatusIcon(health.backend)}
                <span className="text-sm font-medium">Backend</span>
              </div>
            </div>
            <div className={`p-3 rounded-lg border ${getStatusColor(health.database)}`}>
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4" />
                <span className="text-sm font-medium">Database</span>
              </div>
            </div>
            <div className={`p-3 rounded-lg border ${getStatusColor(health.crewaiService)}`}>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                <span className="text-sm font-medium">CrewAI</span>
              </div>
            </div>
            <div className={`p-3 rounded-lg border ${getStatusColor(health.socketio)}`}>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                <span className="text-sm font-medium">Real-time</span>
              </div>
            </div>
          </div>

          {/* Issues Alert */}
          <AnimatePresence>
            {issues.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Alert className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="flex items-center justify-between">
                      <span>
                        {issues.length} service{issues.length > 1 ? 's' : ''} disconnected: {issues.join(', ')}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDetails(!showDetails)}
                      >
                        <Info className="w-4 h-4 mr-1" />
                        {showDetails ? 'Hide' : 'Show'} Details
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Detailed Status (when expanded) */}
          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3"
              >
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Service Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span>Backend API</span>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(health.backend)}
                        <span className="text-xs text-muted-foreground">
                          {health.backend === 'disconnected' ? 'Check if backend server is running' : 'Connected'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>MongoDB Database</span>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(health.database)}
                        <span className="text-xs text-muted-foreground">
                          {health.database === 'disconnected' ? 'Check MongoDB connection' : 'Connected'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>CrewAI Service</span>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(health.crewaiService)}
                        <span className="text-xs text-muted-foreground">
                          {health.crewaiService === 'disconnected' ? 'Service may be sleeping on Render' : 'Connected'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Fix Actions */}
                {issues.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3">Quick Fixes</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      {issues.includes('backend') && (
                        <Button variant="outline" size="sm" asChild>
                          <a href="#" onClick={() => window.open('/api/v1/health', '_blank')}>
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Test Backend API
                          </a>
                        </Button>
                      )}
                      {issues.includes('database') && (
                        <Button variant="outline" size="sm">
                          <Settings className="w-4 h-4 mr-2" />
                          Check MongoDB
                        </Button>
                      )}
                      {issues.includes('crewaiService') && (
                        <Button variant="outline" size="sm" asChild>
                          <a href="https://synapse-crewai.onrender.com" target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Wake CrewAI Service
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
            <span>Last checked: {health.lastChecked.toLocaleTimeString()}</span>
            <span>Auto-checking every 30s</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};