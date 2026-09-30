import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The API runs as a separate process on port 3000. Without this proxy the
// frontend's relative /api calls would hit the Vite dev server and 404.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})
