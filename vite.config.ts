import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

const runtimeBase = (process.env.VITE_CLARITY_RUNTIME_BASE || '').trim() || '/'

export default defineConfig({
  base: runtimeBase,
  server: {
    host: true,
    // Allow preview traffic when hosted behind an ALB or reverse proxy.
    allowedHosts: true,
    hmr: false,
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
