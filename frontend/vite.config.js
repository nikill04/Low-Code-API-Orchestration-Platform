import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Proxy /api and /mock through to the backend in dev so the browser
// never has to deal with cross-origin requests while we're iterating.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
      '/mock': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
});
