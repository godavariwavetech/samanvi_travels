import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  // Production is served from the domain root by Apache; the staging build is
  // served by Apache too, but out of public_html/staging/, so every emitted
  // asset URL has to carry that prefix or the browser resolves it against the
  // root and gets production's (differently hashed) files. The router reads the
  // same value back out of import.meta.env.BASE_URL.
  base: mode === 'staging' ? '/staging/' : '/',
  // Only the staging build ships a .htaccess (the SPA rewrite, scoped to
  // /staging/). Production's public_html has its own and both deploy workflows
  // exclude .htaccess from rsync, so this can never overwrite one on the server.
  publicDir: mode === 'staging' ? 'public-staging' : 'public',
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
}))
