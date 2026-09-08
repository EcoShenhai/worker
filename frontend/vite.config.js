import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev server proxies /api to the backend on 4019.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4019',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
