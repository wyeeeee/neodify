import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const envDir = '../../env/web'
  const env = loadEnv(mode, envDir, '')
  const proxyTarget = env.VITE_API_PROXY_TARGET ?? 'http://127.0.0.1:3000'

  return {
    plugins: [vue()],
    envDir,
    server: {
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      }
    },
    envPrefix: ['VITE_'],
    test: {
      environment: 'jsdom',
      globals: true
    }
  }
})
