import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['shared'],
  },
  server: {
    host: '127.0.0.1',
    port: 5010,
    strictPort: false,
    open: true,
    proxy: {
      '/api': { target: 'http://localhost:5005', changeOrigin: true },
    },
  },
});
