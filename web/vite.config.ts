import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Proxy API calls to the .NET API so the browser stays same-origin in dev
    // (mirrors production, where Firebase Hosting rewrites /api/** to Cloud Run).
    // No CORS needed, and it doesn't matter which port Vite picks.
    proxy: {
      '/api': {
        target: 'http://localhost:5095',
        changeOrigin: true,
      },
    },
  },
})
