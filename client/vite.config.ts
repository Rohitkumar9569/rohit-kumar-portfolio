// File: client/vite.config.ts

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path'; // ADDED: Import 'path' module

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // This section creates the '@' alias for simpler import paths.
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // our existing server proxy configuration remains unchanged.
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    }
  }
});