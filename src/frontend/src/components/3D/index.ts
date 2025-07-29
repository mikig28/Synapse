// Production-safe 2D dashboard components
// These components replace Three.js components with CSS-based 2D alternatives

export { ProductionSafe2DDashboard } from './ProductionSafe2DDashboard';
export { Enhanced2DFallback } from './Enhanced2DFallback';
export { ProductionReady3DDashboard } from './ProductionReady3DDashboard';

// Type exports
export type { SceneTheme, PerformanceMetrics } from './ProductionReady3DDashboard';

// Default export for backward compatibility
export { ProductionReady3DDashboard as default } from './ProductionReady3DDashboard';