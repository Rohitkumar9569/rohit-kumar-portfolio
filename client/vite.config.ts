import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Add the server proxy configuration here
  server: {
    proxy: {
      // This will proxy any request starting with /api to the backend server
      '/api': {
        target: 'http://localhost:5000', // Your backend server address
        changeOrigin: true, // Recommended for virtual hosted sites
        secure: false,      // Can be false for http target
      },
    }
  }
})