import { defineConfig, PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Lazy-load rollup-plugin-visualizer only when requested and when the package is available.
const plugins: PluginOption[] = [react()];

if (process.env.VISUALIZER) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { visualizer } = require('rollup-plugin-visualizer');
    plugins.push(
      visualizer({
        template: 'treemap',
        open: true,
        gzipSize: true,
        brotliSize: true,
        filename: 'bundle-analysis.html', // Relative to the root of the project
      }) as unknown as PluginOption
    );
  } catch (err) {
    console.warn('rollup-plugin-visualizer is not installed. Skipping bundle analysis plugin.');
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // SSR configuration for production compatibility
  ssr: {
    noExternal: []
  },
  server: {
    port: 5173,
    strictPort: true, // Exit if port is already in use
    host: true, // Expose to network
    open: false, // Don't auto-open browser
    proxy: {
      '/api/v1': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  },
  build: {
    rollupOptions: {
      // Don't externalize in production as it would break the app
      output: {
        manualChunks(id) {
          // Performance optimization: Create strategic chunks for better caching
          
          // React core - stable, rarely changes
          if (id.includes('react') && !id.includes('react-router')) {
            return 'react-core';
          }
          
          // Animation libraries - large but stable
          if (id.includes('framer-motion') || id.includes('motion-dom')) {
            return 'animations';
          }
          
          
          // Charts library - large and not always needed
          if (id.includes('recharts')) {
            return 'charts';
          }
          
          // Virtualization - specific feature
          if (id.includes('react-window')) {
            return 'virtualization';
          }
          
          // Icon libraries - frequently used but stable
          if (id.includes('lucide-react')) {
            return 'icons';
          }
          
          // UI component libraries - stable but large
          if (id.includes('@radix-ui')) {
            return 'ui-components';
          }
          
          // Routing - needed early
          if (id.includes('react-router')) {
            return 'routing';
          }
          
          // State management - core functionality
          if (id.includes('zustand')) {
            return 'state-management';
          }
          
          // Utility libraries - small and stable
          if (id.includes('date-fns') || id.includes('clsx') || id.includes('class-variance-authority')) {
            return 'utils';
          }
          
          // Socket.io - real-time features
          if (id.includes('socket.io')) {
            return 'realtime';
          }
          
          // Markdown and content processing
          if (id.includes('react-markdown') || id.includes('remark') || id.includes('micromark')) {
            return 'markdown';
          }
          
          // Performance monitoring
          if (id.includes('web-vitals')) {
            return 'performance';
          }
          
          // All other vendor libraries
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
        // Optimize chunk naming for better caching
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId 
            ? chunkInfo.facadeModuleId.split('/').pop() 
            : 'chunk';
          return `assets/[name]-[hash].js`;
        },
        // Optimize asset naming
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/woff2?|eot|ttf|otf/i.test(ext)) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
      // External dependencies for advanced optimization
      external: (id) => {
        // Don't externalize anything for now, but this could be used
        // for CDN dependencies in the future
        return false;
      },
    },
    chunkSizeWarningLimit: 800, // Increased limit for better chunking
    // Enable source maps for production debugging (optional)
    sourcemap: process.env.NODE_ENV === 'development' ? true : 'hidden',
    // Optimize CSS - enable code splitting
    cssCodeSplit: true,
    // Advanced minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production', // Keep console in dev
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info'], // Remove specific console methods
        passes: 2, // Multiple passes for better compression
      },
      mangle: {
        safari10: true, // Fix Safari 10/11 bugs
      },
      format: {
        comments: false, // Remove all comments
      },
    },
    // Target modern browsers for better optimization
    target: ['es2020', 'chrome80', 'firefox78', 'safari14'],
    // Asset inlining threshold
    assetsInlineLimit: 4096, // 4KB limit for inlining assets
  },
  // Optimize dependencies for better dev performance
  optimizeDeps: {
    include: [
      // Core dependencies that should be pre-bundled
      'react',
      'react-dom',
      'react-router-dom',
      'zustand',
      
      // UI libraries that benefit from pre-bundling
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-toast',
      'framer-motion',
      
      
      // Utility libraries
      'clsx',
      'date-fns',
      'axios',
      
      // Performance monitoring
      'web-vitals',
      
      // Virtualization
      'react-window',
    ],
    exclude: [
      // These can cause issues when pre-bundled
      'motion-dom',
    ],
    // Force optimization of specific dependencies
    force: true,
    // Entry points for better dependency analysis
    entries: [
      'src/main.tsx',
      'src/pages/**/*.tsx',
      'src/components/**/*.tsx',
    ],
  },
  
  // Performance optimizations
  esbuild: {
    // Drop console and debugger in production
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
    // Target modern browsers
    target: 'es2020',
    // Optimize for speed
    minify: process.env.NODE_ENV === 'production',
  },
}) 