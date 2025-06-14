import { defineConfig, PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    visualizer({
      template: 'treemap',
      open: true,
      gzipSize: true,
      brotliSize: true,
      filename: 'bundle-analysis.html',
    }) as unknown as PluginOption,
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api/v1': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Animation libraries
          if (id.includes('framer-motion')) {
            return 'framer-motion';
          }
          
          // Icon libraries
          if (id.includes('lucide-react')) {
            return 'lucide-react';
          }
          
          // UI component libraries
          if (id.includes('@radix-ui')) {
            return 'radix-ui';
          }
          
          // React ecosystem
          if (id.includes('react-router')) {
            return 'react-router';
          }
          
          // State management
          if (id.includes('zustand')) {
            return 'zustand';
          }
          
          // Utility libraries
          if (id.includes('date-fns') || id.includes('clsx') || id.includes('class-variance-authority')) {
            return 'utils';
          }
          
          // Large vendor libraries
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    },
    chunkSizeWarningLimit: 500,
    // Enable source maps for production debugging
    sourcemap: false,
    // Optimize CSS
    cssCodeSplit: true,
    // Enable minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true,
      },
    },
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'framer-motion',
      'lucide-react',
      'zustand',
    ],
  },
}) 