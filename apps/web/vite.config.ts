import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

const proxyTarget = process.env.VITE_API_PROXY_TARGET ?? 'http://127.0.0.1:3000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
