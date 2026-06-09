// File: client/vite.config.ts

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path'; // ADDED: Import 'path' module

const apiProxyTarget = process.env.VITE_API_PROXY_TARGET || process.env.VITE_API_BASE_URL || 'http://localhost:5001';
const reactPath = path.resolve(__dirname, './node_modules/react');
const reactDomPath = path.resolve(__dirname, './node_modules/react-dom');

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // This section creates the '@' alias for simpler import paths.
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      react: reactPath,
      'react/jsx-runtime': path.resolve(reactPath, './jsx-runtime.js'),
      'react/jsx-dev-runtime': path.resolve(reactPath, './jsx-dev-runtime.js'),
      'react-dom': reactDomPath,
      'react-dom/client': path.resolve(reactDomPath, './client.js'),
    },
    dedupe: ['react', 'react-dom'],
  },

  optimizeDeps: {
    include: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-helmet-async'],
    force: true,
  },

  // Keep local API traffic pointed at this project's backend.
  server: {
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
        secure: false,
      },
    }
  },

  build: {
    chunkSizeWarningLimit: 1000,
    modulePreload: {
      resolveDependencies(_filename, deps) {
        const deferredHomepageChunks = [
          'pdf-vendor',
          'markdown-vendor',
          'query-vendor',
          'three-vendor',
        ];

        return deps.filter(
          (dep) => !deferredHomepageChunks.some((chunkName) => dep.includes(chunkName))
        );
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/react-router-dom/') ||
            id.includes('/scheduler/')
          ) {
            return 'react-vendor';
          }
          if (id.includes('react-pdf') || id.includes('pdfjs-dist')) return 'pdf-vendor';
          if (id.includes('@react-three') || id.includes('@use-gesture') || id.includes('three')) return 'three-vendor';
          if (id.includes('framer-motion') || id.includes('react-spring') || id.includes('lenis')) return 'motion-vendor';
          if (id.includes('@tanstack')) return 'query-vendor';
          if (id.includes('react-markdown') || id.includes('remark') || id.includes('rehype')) return 'markdown-vendor';
          if (id.includes('react-icons')) return 'icons-vendor';
          if (id.includes('@heroicons') || id.includes('@radix-ui') || id.includes('vaul') || id.includes('cmdk')) {
            return 'ui-vendor';
          }
          return undefined;
        },
      },
    },
  },
});
