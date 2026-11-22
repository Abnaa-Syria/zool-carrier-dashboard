import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    // Same-origin API in development so the HttpOnly carrier refresh cookie (path /api/v1/carrier/auth) works.
    proxy: {
      '/api': { target: process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:4000', changeOrigin: true },
    },
  },
})
