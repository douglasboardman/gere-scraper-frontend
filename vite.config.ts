import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig(({ command, mode }) => {
  const apiOrigin = loadEnv(mode, process.cwd(), 'VITE_').VITE_API_URL
  // O bundle servido pelo Apache deve alcançar a API da mesma origem.
  const localApi = /^https?:\/\/(?:localhost\.?|127(?:\.\d{1,3}){3}|\[::1\])(?=[:/]|$)/i
  const useApacheProxy = command === 'build' && localApi.test(apiOrigin || '')

  return {
    define: useApacheProxy ? { 'import.meta.env.VITE_API_URL': JSON.stringify('') } : {},
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          // sem rewrite: o NestJS usa setGlobalPrefix('api'), então /api/* deve chegar intacto
        },
      },
    },
  }
})
