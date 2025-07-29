/**
 * Accessible 3D Alternatives Component
 * Provides accessible alternatives to 3D visualizations
 * WCAG 2.1 AA Compliant
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAccessibilityContext } from '@/contexts/AccessibilityContext';
import { DescriptiveText, ComplexUIDescription } from './DescriptiveText';
import { KeyboardNavigation, RovingTabindex } from './KeyboardNavigation';
import { cn } from '@/lib/utils';
import {
  Monitor,
  Grid3X3,
  List,
  Eye,
  EyeOff,
  Keyboard,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Settings,
  Info,
  Grid,
  BarChart3,
} from 'lucide-react';

// Agent status type (matching your existing types)
interface AgentStatus {
  id: string;
  name: string;
  type: string;
  status: 'running' | 'idle' | 'error' | 'completed' | 'paused';
  position?: { x: number; y: number; z: number };
  description?: string;
  metrics?: {
    successRate: number;
    itemsProcessed: number;
    uptime: number;
  };
}

interface Accessible3DAlternativesProps {
  agents: AgentStatus[];
  selectedAgent?: string | null;
  onAgentSelect?: (agentId: string | null) => void;
  className?: string;
}

export const Accessible3DAlternatives: React.FC<Accessible3DAlternativesProps> = ({
  agents,
  selectedAgent,
  onAgentSelect,
  className
}) => {
  const { settings, screenReader, keyboardNavigation } = useAccessibilityContext();
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'spatial'>('grid');
  const [showDescriptions, setShowDescriptions] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [currentFocus, setCurrentFocus] = useState<string | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Audio synthesis for spatial audio cues
  const audioContext = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (audioEnabled && !audioContext.current) {
      try {
        audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (error) {
        console.warn('Web Audio API not supported');
        setAudioEnabled(false);
      }
    }
  }, [audioEnabled]);

  // Get agent status description
  const getAgentStatusDescription = useCallback((agent: AgentStatus): string => {
    const statusDescriptions = {
      running: 'currently processing tasks',
      idle: 'ready and waiting for tasks',
      error: 'encountered an error and needs attention',
      completed: 'successfully completed its last task',
      paused: 'temporarily paused',
    };

    let description = `${agent.name}, a ${agent.type} agent, is ${statusDescriptions[agent.status]}`;
    
    if (agent.metrics) {
      description += `. Performance: ${agent.metrics.successRate}% success rate, ${agent.metrics.itemsProcessed} items processed, ${agent.metrics.uptime}% uptime`;
    }

    if (agent.position) {
      const { x, y, z } = agent.position;
      description += `. Spatial position: ${x > 0 ? 'right' : x < 0 ? 'left' : 'center'}, ${y > 0 ? 'up' : y < 0 ? 'down' : 'middle'}, ${z > 0 ? 'forward' : z < 0 ? 'back' : 'center'}`;
    }

    return description;
  }, []);

  // Play spatial audio cue
  const playAudioCue = useCallback((agent: AgentStatus) => {
    if (!audioEnabled || !audioContext.current || !agent.position) return;

    const context = audioContext.current;
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    const panner = context.createPanner();

    // Configure spatial audio
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 1;
    panner.maxDistance = 10000;
    panner.rolloffFactor = 1;
    panner.coneInnerAngle = 360;
    panner.coneOuterAngle = 0;
    panner.coneOuterGain = 0;

    // Set position
    panner.positionX.setValueAtTime(agent.position.x, context.currentTime);
    panner.positionY.setValueAtTime(agent.position.y, context.currentTime);
    panner.positionZ.setValueAtTime(agent.position.z, context.currentTime);

    // Configure tone based on status
    const frequencies: Record<string, number> = {
      running: 440, // A4
      idle: 330,    // E4
      error: 220,   // A3
      completed: 523, // C5
      paused: 294,  // D4
    };

    oscillator.frequency.setValueAtTime(frequencies[agent.status] || 440, context.currentTime);
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.1, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.5);

    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(panner);
    panner.connect(context.destination);

    // Play
    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + 0.5);
  }, [audioEnabled]);

  // Handle agent selection
  const handleAgentSelect = useCallback((agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;

    setCurrentFocus(agentId);
    onAgentSelect?.(agentId);

    // Play audio cue
    playAudioCue(agent);

    // Announce selection
    if (settings.announceActions) {
      const description = getAgentStatusDescription(agent);
      screenReader.announce(`Selected agent: ${description}`, 'polite');
    }
  }, [agents, onAgentSelect, playAudioCue, settings.announceActions, screenReader, getAgentStatusDescription]);

  // Switch view mode
  const switchViewMode = useCallback((mode: 'grid' | 'list' | 'spatial') => {
    setViewMode(mode);
    screenReader.announce(
      `Switched to ${mode} view. ${
        mode === 'grid' ? 'Agents displayed in a grid layout.' :
        mode === 'list' ? 'Agents displayed as a list with detailed information.' :
        'Agents displayed with spatial relationships.'
      }`,
      'polite'
    );
  }, [screenReader]);

  // Keyboard shortcuts for 3D navigation alternative
  const keyboardShortcuts = [
    { key: 'Arrow Keys', action: 'Navigate between agents' },
    { key: 'Enter', action: 'Select focused agent' },
    { key: 'Space', action: 'Toggle agent details' },
    { key: 'G', action: 'Switch to grid view' },
    { key: 'L', action: 'Switch to list view' },
    { key: 'S', action: 'Switch to spatial view' },
    { key: 'A', action: 'Toggle audio cues' },
    { key: 'D', action: 'Toggle descriptions' },
    { key: 'Escape', action: 'Clear selection' },
  ];

  // Grid View Component
  const GridView = () => (
            <RovingTabindex
      direction="both"
      wrap={true}
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
      role="grid"
      aria-label="Agent grid view"
    >
      {agents.map((agent) => (
        <motion.div
          key={agent.id}
          layout
          className={cn(
            'p-4 border rounded-lg cursor-pointer transition-colors',
            'focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2',
            selectedAgent === agent.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50',
            agent.status === 'error' ? 'border-red-200 bg-red-50' : '',
            agent.status === 'running' ? 'border-green-200 bg-green-50' : ''
          )}
          role="gridcell"
          tabIndex={0}
          onClick={() => handleAgentSelect(agent.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleAgentSelect(agent.id);
            }
          }}
          aria-label={getAgentStatusDescription(agent)}
          aria-selected={selectedAgent === agent.id}
        >
          <div className="text-center space-y-2">
            <div className={cn(
              'w-12 h-12 mx-auto rounded-full flex items-center justify-center',
              agent.status === 'running' ? 'bg-green-100 text-green-600' :
              agent.status === 'error' ? 'bg-red-100 text-red-600' :
              agent.status === 'completed' ? 'bg-blue-100 text-blue-600' :
              'bg-gray-100 text-gray-600'
            )}>
              <Grid className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <h4 className="font-medium text-sm">{agent.name}</h4>
              <p className="text-xs text-muted-foreground capitalize">{agent.type}</p>
              <Badge
                variant={agent.status === 'running' ? 'default' : 'secondary'}
                className="text-xs mt-1"
              >
                {agent.status}
              </Badge>
            </div>
          </div>
        </motion.div>
      ))}
            </RovingTabindex>
  );

  // List View Component
  const ListView = () => (
    <div className="space-y-2" role="list" aria-label="Agent list view">
      {agents.map((agent) => (
        <motion.div
          key={agent.id}
          layout
          className={cn(
            'p-4 border rounded-lg cursor-pointer transition-colors',
            'focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2',
            selectedAgent === agent.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
          )}
          role="listitem"
          tabIndex={0}
          onClick={() => handleAgentSelect(agent.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleAgentSelect(agent.id);
            }
          }}
          aria-label={getAgentStatusDescription(agent)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center',
                agent.status === 'running' ? 'bg-green-100 text-green-600' :
                agent.status === 'error' ? 'bg-red-100 text-red-600' :
                agent.status === 'completed' ? 'bg-blue-100 text-blue-600' :
                'bg-gray-100 text-gray-600'
              )}>
                <Grid className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <h4 className="font-medium">{agent.name}</h4>
                <p className="text-sm text-muted-foreground capitalize">{agent.type} agent</p>
                {showDescriptions && agent.description && (
                  <p className="text-xs text-muted-foreground mt-1">{agent.description}</p>
                )}
              </div>
            </div>
            <div className="text-right">
              <Badge
                variant={agent.status === 'running' ? 'default' : 'secondary'}
                className="mb-2"
              >
                {agent.status}
              </Badge>
              {agent.metrics && (
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>Success: {agent.metrics.successRate}%</div>
                  <div>Items: {agent.metrics.itemsProcessed}</div>
                  <div>Uptime: {agent.metrics.uptime}%</div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );

  // Spatial View Component (represents 3D relationships in 2D)
  const SpatialView = () => {
    const gridSize = 200;
    const centerX = gridSize / 2;
    const centerY = gridSize / 2;

    return (
      <div 
        className="relative border rounded-lg bg-muted/20 overflow-hidden"
        style={{ height: '400px' }}
        role="img"
        aria-label="Spatial representation of agent positions"
      >
        {/* Grid background */}
        <svg className="absolute inset-0 w-full h-full" aria-hidden="true">
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.3"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Center reference */}
        <div 
          className="absolute w-2 h-2 bg-primary rounded-full"
          style={{ 
            left: '50%', 
            top: '50%', 
            transform: 'translate(-50%, -50%)' 
          }}
          aria-hidden="true"
        />

        {/* Agents */}
        {agents.map((agent) => {
          const x = agent.position ? (agent.position.x + 5) * 20 : centerX;
          const y = agent.position ? (agent.position.z + 5) * 20 : centerY; // Using Z for Y position
          
          return (
            <motion.button
              key={agent.id}
              className={cn(
                'absolute w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-medium',
                'focus:ring-2 focus:ring-primary focus:ring-offset-2',
                selectedAgent === agent.id ? 'ring-2 ring-primary' : '',
                agent.status === 'running' ? 'bg-green-100 border-green-500 text-green-700' :
                agent.status === 'error' ? 'bg-red-100 border-red-500 text-red-700' :
                agent.status === 'completed' ? 'bg-blue-100 border-blue-500 text-blue-700' :
                'bg-gray-100 border-gray-500 text-gray-700'
              )}
              style={{
                left: `${Math.max(16, Math.min(x, gridSize * 2 - 16))}px`,
                top: `${Math.max(16, Math.min(y, 400 - 16))}px`,
                transform: 'translate(-50%, -50%)'
              }}
              onClick={() => handleAgentSelect(agent.id)}
              aria-label={`${agent.name} at position ${agent.position ? `${agent.position.x}, ${agent.position.z}` : 'center'}. ${getAgentStatusDescription(agent)}`}
            >
              {agent.name.charAt(0)}
            </motion.button>
          );
        })}

        {/* Legend */}
        <div className="absolute bottom-2 left-2 text-xs text-muted-foreground bg-background/80 p-2 rounded">
          <div>Center: Origin point</div>
          <div>Position represents 3D coordinates in 2D space</div>
        </div>
      </div>
    );
  };

  return (
    <div ref={containerRef} className={cn('w-full space-y-4', className)}>
      {/* Header with Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Monitor className="w-5 h-5" />
              Agent Visualization
              <Badge variant="secondary" className="ml-2">
                Accessible Alternative
              </Badge>
            </CardTitle>
            
            <div className="flex items-center gap-2">
              {/* Audio toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAudioEnabled(!audioEnabled)}
                aria-pressed={audioEnabled}
                aria-label={`${audioEnabled ? 'Disable' : 'Enable'} spatial audio cues`}
              >
                {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </Button>

              {/* Description toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDescriptions(!showDescriptions)}
                aria-pressed={showDescriptions}
                aria-label={`${showDescriptions ? 'Hide' : 'Show'} agent descriptions`}
              >
                {showDescriptions ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Instructions */}
          <ComplexUIDescription
            element="Agent Visualization"
            state={`${viewMode} view, ${agents.length} agents`}
            instructions={[
              'Use arrow keys to navigate between agents',
              'Press Enter or Space to select an agent',
              'Use view buttons to switch layouts',
              'Enable audio for spatial sound cues',
            ]}
            shortcuts={keyboardShortcuts}
            visuallyHidden={!settings.verboseDescriptions}
          />
        </CardHeader>

        <CardContent>
          {/* View Mode Selector */}
          <div 
            className="flex rounded-lg border mb-4"
            role="tablist"
            aria-label="Visualization view modes"
          >
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => switchViewMode('grid')}
              role="tab"
              aria-selected={viewMode === 'grid'}
              className="rounded-r-none"
            >
              <Grid3X3 className="w-4 h-4 mr-2" />
              Grid
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => switchViewMode('list')}
              role="tab"
              aria-selected={viewMode === 'list'}
              className="rounded-none"
            >
              <List className="w-4 h-4 mr-2" />
              List
            </Button>
            <Button
              variant={viewMode === 'spatial' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => switchViewMode('spatial')}
              role="tab"
              aria-selected={viewMode === 'spatial'}
              className="rounded-l-none"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Spatial
            </Button>
          </div>

          {/* Content Area */}
          <div className="min-h-[300px]">
            <AnimatePresence mode="wait">
              {viewMode === 'grid' && (
                <motion.div
                  key="grid"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                >
                  <GridView />
                </motion.div>
              )}
              {viewMode === 'list' && (
                <motion.div
                  key="list"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                >
                  <ListView />
                </motion.div>
              )}
              {viewMode === 'spatial' && (
                <motion.div
                  key="spatial"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                >
                  <SpatialView />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Selected Agent Details */}
          {selectedAgent && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t"
            >
              {(() => {
                const agent = agents.find(a => a.id === selectedAgent);
                if (!agent) return null;

                return (
                  <div className="space-y-2">
                    <h4 className="font-medium">Selected Agent Details</h4>
                    <DescriptiveText
                      level="detailed"
                      className="text-sm"
                    >
                      {getAgentStatusDescription(agent)}
                    </DescriptiveText>
                    {agent.position && (
                      <div className="text-sm text-muted-foreground">
                        <strong>3D Position:</strong> X: {agent.position.x}, Y: {agent.position.y}, Z: {agent.position.z}
                      </div>
                    )}
                  </div>
                );
              })()}
            </motion.div>
          )}

          {/* Summary */}
          <div 
            className="mt-4 pt-4 border-t text-sm text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            Showing {agents.length} agents in {viewMode} view.
            {selectedAgent && ` Selected: ${agents.find(a => a.id === selectedAgent)?.name}`}
            {audioEnabled && ' Spatial audio enabled.'}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Accessible3DAlternatives;