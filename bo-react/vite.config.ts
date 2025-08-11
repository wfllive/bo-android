import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/rpc': {
        target: 'http://localhost:7070',
        changeOrigin: true,
      },
    },
  },
})