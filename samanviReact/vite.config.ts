import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5174,
    proxy: {
      // Backend only listens over HTTPS on 8945 (see samanviBackend/app.js —
      // the plain-HTTP local listener was commented out when the HTTPS
      // listener got restored for production). secure:false because the
      // cert is issued for the production domain, not localhost.
      '/nodeapp': {
        target: 'https://localhost:8945',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
