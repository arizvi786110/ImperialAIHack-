import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Dev: same-origin /api and /health are proxied to FastAPI.
  server: { proxy: {
    '/api': {target: 'http://localhost:8000', changeOrigin: true},
    '/health': {target: 'http://localhost:8000', changeOrigin: true},
  }},
  // The Pyodide worker is a module worker (it dynamically imports pyodide.mjs from the CDN).
  worker: { format: 'es' },
})
