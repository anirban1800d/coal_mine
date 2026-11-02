import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // allowedHosts: true permits any hostname (including ngrok tunnel URLs)
    // when running: npm run dev -- --host 0.0.0.0
    // This is only needed for optional LAN/ngrok-dev mode.
    // Normal local dev (localhost:5173) is completely unaffected.
    allowedHosts: true,
    proxy: {
      '/cpcb': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/dgms': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api/, '')
      },
      '/ws': {
        target: 'ws://127.0.0.1:8000',
        ws: true,
        changeOrigin: true,
      },
      '/ppe': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    }
  }
});
