import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@shared': resolve(__dirname, '../shared'),
      // shared 目录无独立 node_modules，显式指向本项目依赖
      'axios': resolve(__dirname, 'node_modules/axios'),
    },
  },
  server: {
    port: 3001,
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
  base: '/his/',
})
