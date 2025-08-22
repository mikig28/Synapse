import React, { useMemo, useCallback, useState, useEffect, memo } from 'react';
import { FixedSizeGrid as Grid, VariableSizeGrid } from 'react-window';
import { motion, AnimatePresence } from 'framer-motion';
import { Agent } from '@/types/agent';
import { EnhancedAgentCard } from './EnhancedAgentCard';
import { MobileAgentCard } from './MobileAgentCard';
import { useIsMobile } from '@/hooks/useMobileDetection';
import { AgentCardSkeleton } from './animations/LoadingAnimations';
import { useNavigate } from 'react-router-dom';
import { containerVariants, cardVariants } from '@/utils/animations';

interface VirtualizedAgentGridProps {
  agents: Agent[];
  executingAgents: Set<string>;
  onExecute: (agentId: string, force?: boolean) => void;
  onToggle: (agent: Agent) => void;
  onDelete: (agentId: string) => void;
  onReset: (agentId: string) => void;
  formatTimeAgo: (dateString: string) => string;
  loading?: boolean;
  className?: string;
}

interface GridItemProps {
  columnIndex: number;
  rowIndex: number;
  style: React.CSSProperties;
  data: {
    agents: Agent[];
    columnCount: number;
    executingAgents: Set<string>;
    onExecute: (agentId: string, force?: boolean) => void;
    onToggle: (agent: Agent) => void;
    onDelete: (agentId: string) => void;
    onReset: (agentId: string) => void;
    formatTimeAgo: (dateString: string) => string;
    navigate: (path: string) => void;
    isMobile: boolean;
  };
}

// Memoized grid item component for optimal performance
const GridItem = memo<GridItemProps>(({ columnIndex, rowIndex, style, data }) => {
  const {
    agents,
    columnCount,
    executingAgents,
    onExecute,
    onToggle,
    onDelete,
    onReset,
    formatTimeAgo,
    navigate,
    isMobile
  } = data;

  const index = rowIndex * columnCount + columnIndex;
  const agent = agents[index];

  if (!agent) {
    return <div style={style} />;
  }

  const handleSettings = useCallback((agentId: string) => {
    navigate(`/agents/${agentId}/settings`);
  }, [navigate]);

  return (
    <div style={style}>
      <div className="p-2 h-full">
        {isMobile ? (
          <MobileAgentCard
            agent={agent}
            isExecuting={executingAgents.has(agent._id)}
            onExecute={onExecute}
            onToggle={onToggle}
            onDelete={onDelete}
            onReset={onReset}
            onSettings={handleSettings}
            formatTimeAgo={formatTimeAgo}
          />
        ) : (
          <EnhancedAgentCard
            agent={agent}
            isExecuting={executingAgents.has(agent._id)}
            onExecute={onExecute}
            onToggle={onToggle}
            onDelete={onDelete}
            onReset={onReset}
            onSettings={handleSettings}
            formatTimeAgo={formatTimeAgo}
          />
        )}
      </div>
    </div>
  );
});

GridItem.displayName = 'GridItem';

// Custom hook for responsive grid calculations
const useGridDimensions = (agents: Agent[], containerWidth: number, isMobile: boolean) => {
  return useMemo(() => {
    if (isMobile) {
      return {
        columnCount: 1,
        columnWidth: containerWidth,
        rowHeight: 280, // Height for mobile cards
      };
    }

    // Desktop responsive columns
    const minCardWidth = 380;
    const gap = 32; // 8 * 4 (gap-8 in Tailwind)
    const availableWidth = containerWidth - gap;
    const possibleColumns = Math.floor((availableWidth + gap) / (minCardWidth + gap));
    const columnCount = Math.max(1, Math.min(possibleColumns, 4)); // Max 4 columns
    
    const columnWidth = Math.floor((availableWidth - (columnCount - 1) * gap) / columnCount);
    
    return {
      columnCount,
      columnWidth: columnWidth + gap, // Include gap in column width
      rowHeight: 320, // Height for desktop cards
    };
  }, [agents.length, containerWidth, isMobile]);
};

// Performance monitoring hook
const usePerformanceMetrics = () => {
  const [metrics, setMetrics] = useState({
    renderTime: 0,
    lastRenderCount: 0,
    averageRenderTime: 0,
  });

  const measureRender = useCallback((startTime: number, itemCount: number) => {
    const renderTime = performance.now() - startTime;
    setMetrics(prev => ({
      renderTime,
      lastRenderCount: itemCount,
      averageRenderTime: (prev.averageRenderTime + renderTime) / 2,
    }));
  }, []);

  return { metrics, measureRender };
};

export const VirtualizedAgentGrid: React.FC<VirtualizedAgentGridProps> = memo(({
  agents,
  executingAgents,
  onExecute,
  onToggle,
  onDelete,
  onReset,
  formatTimeAgo,
  loading = false,
  className = '',
}) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const { metrics, measureRender } = usePerformanceMetrics();

  // Container size observer
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerSize({
          width: entry.contentRect.width,
          height: Math.max(600, entry.contentRect.height),
        });
      }
    });

    resizeObserver.observe(node);
    return () => resizeObserver.disconnect();
  }, []);

  const { columnCount, columnWidth, rowHeight } = useGridDimensions(
    agents,
    containerSize.width,
    isMobile
  );

  const rowCount = Math.ceil(agents.length / columnCount);

  // Memoized grid data to prevent unnecessary re-renders
  const gridData = useMemo(() => ({
    agents,
    columnCount,
    executingAgents,
    onExecute,
    onToggle,
    onDelete,
    onReset,
    formatTimeAgo,
    navigate,
    isMobile,
  }), [
    agents,
    columnCount,
    executingAgents,
    onExecute,
    onToggle,
    onDelete,
    onReset,
    formatTimeAgo,
    navigate,
    isMobile,
  ]);

  // Performance measurement
  useEffect(() => {
    const startTime = performance.now();
    const timer = setTimeout(() => {
      measureRender(startTime, agents.length);
    }, 0);
    return () => clearTimeout(timer);
  }, [agents.length, measureRender]);

  // Loading skeleton
  if (loading) {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className={`w-full ${className}`}
      >
        <div className={isMobile ? "space-y-4" : "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8"}>
          {Array.from({ length: 6 }).map((_, index) => (
            <AgentCardSkeleton
              key={index}
              animation="wave"
              className="h-full"
            />
          ))}
        </div>
      </motion.div>
    );
  }

  // Empty state
  if (agents.length === 0) {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className={`flex items-center justify-center py-12 ${className}`}
      >
        <div className="text-center text-muted-foreground">
          <div className="text-lg font-medium mb-2">No agents found</div>
          <div className="text-sm">Create your first agent to get started</div>
        </div>
      </motion.div>
    );
  }

  // Small lists don't need virtualization
  if (agents.length <= 12) {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className={`w-full ${className}`}
      >
        <div className={isMobile ? "space-y-4" : "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8"}>
          {agents.map((agent) => (
            isMobile ? (
              <MobileAgentCard
                key={agent._id}
                agent={agent}
                isExecuting={executingAgents.has(agent._id)}
                onExecute={onExecute}
                onToggle={onToggle}
                onDelete={onDelete}
                onReset={onReset}
                onSettings={(agentId) => navigate(`/agents/${agentId}/settings`)}
                formatTimeAgo={formatTimeAgo}
              />
            ) : (
              <EnhancedAgentCard
                key={agent._id}
                agent={agent}
                isExecuting={executingAgents.has(agent._id)}
                onExecute={onExecute}
                onToggle={onToggle}
                onDelete={onDelete}
                onReset={onReset}
                onSettings={(agentId) => navigate(`/agents/${agentId}/settings`)}
                formatTimeAgo={formatTimeAgo}
              />
            )
          ))}
        </div>
        
        {/* Debug info for non-virtualized grid */}
        {import.meta.env.DEV && (
          <div className="mt-4 text-xs text-muted-foreground opacity-50">
            Non-virtualized: {agents.length} agents
            | Mobile: {isMobile ? '📱 YES' : '🖥️ NO'}
            | Using: {isMobile ? 'MobileAgentCard' : 'EnhancedAgentCard'}
          </div>
        )}
      </motion.div>
    );
  }

  // Virtualized grid for large lists
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={`w-full ${className}`}
    >
      <div ref={containerRef} className="w-full">
        {containerSize.width > 0 && (
          <>
            <Grid
              columnCount={columnCount}
              columnWidth={columnWidth}
              height={Math.min(containerSize.height, rowCount * rowHeight)}
              rowCount={rowCount}
              rowHeight={rowHeight}
              width={containerSize.width}
              itemData={gridData}
              overscanRowCount={2}
              overscanColumnCount={1}
              className="scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600"
            >
              {GridItem}
            </Grid>
            
            {/* Performance debug info (only in development) */}
            {import.meta.env.DEV && (
              <div className="mt-4 text-xs text-muted-foreground opacity-50">
                Virtualized: {agents.length} agents, {columnCount} cols, {rowCount} rows
                | Render: {metrics.renderTime.toFixed(1)}ms
                | Avg: {metrics.averageRenderTime.toFixed(1)}ms
                | Mobile: {isMobile ? '📱 YES' : '🖥️ NO'} (Width: {containerSize.width}px)
                | Using: {isMobile ? 'MobileAgentCard' : 'EnhancedAgentCard'}
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
});

VirtualizedAgentGrid.displayName = 'VirtualizedAgentGrid';

export default VirtualizedAgentGrid;