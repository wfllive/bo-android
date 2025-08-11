import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/rpc': {
        target: 'http://bo-service.tryb.de/',
        changeOrigin: true,
        secure: false,
        // Ensure requests like /rpc/get_strikes forward to root
        // Our frontend will call /rpc directly; backend expects POST body with method/params.
        rewrite: () => '/',
      },
    },
  },
})
