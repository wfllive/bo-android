import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const rpcGuardPlugin: Plugin = {
  name: 'rpc-guard',
  configureServer(server) {
    server.middlewares.use('/rpc', (req, res, next) => {
      const r: any = req
      if (r.method !== 'POST') {
        res.statusCode = 405
        res.setHeader('Content-Type', 'text/plain')
        res.end('Use POST with JSON-RPC body at /rpc')
        return
      }
      next()
    })
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), rpcGuardPlugin],
  server: {
    port: 5173,
    proxy: {
      '/rpc': {
        target: 'http://bo-service.tryb.de/',
        changeOrigin: true,
        secure: false,
        rewrite: () => '/',
        configure: (proxy) => {
          const p: any = proxy
          p.on('proxyReq', (proxyReq: any) => {
            try {
              proxyReq.setHeader('User-Agent', 'bo-android-100')
              proxyReq.setHeader('Content-Type', 'text/json')
              proxyReq.setHeader('Accept-Encoding', 'gzip')
            } catch {}
          })
        },
      },
      '/bo': {
        target: 'http://data.blitzortung.org',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/bo/, ''),
      },
    },
  },
})
