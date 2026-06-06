import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  root: 'src/renderer',
  server: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: 'all',
    hmr: process.env.DISABLE_HMR !== 'true'
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer/src')
    }
  }
})
