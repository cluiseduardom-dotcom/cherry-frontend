import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFile } from 'node:fs/promises'
import { resolve } from 'node:path'

// Render static sites may return a 404 for BrowserRouter deep links.
// Publishing the built SPA shell as 404.html lets React Router handle /login
// and other client-side routes when opened directly or refreshed.
function renderSpaFallback() {
  return {
    name: 'render-spa-fallback',
    apply: 'build',
    async closeBundle() {
      await copyFile(resolve('dist/index.html'), resolve('dist/404.html'))
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), renderSpaFallback()],
})
