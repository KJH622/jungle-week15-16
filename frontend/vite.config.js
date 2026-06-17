import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // /api 요청은 Nginx Gateway(8088)를 거쳐 Spring Boot(8080)로 전달
      '/api': {
        target: 'http://localhost:8088',
        changeOrigin: true,
      },
      // /ai 요청은 Nginx Gateway(8088)를 거쳐 FastAPI(8000)로 전달
      '/ai': {
        target: 'http://localhost:8088',
        changeOrigin: true,
      },
    },
  },
})
