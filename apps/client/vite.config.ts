import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/',
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/framer-motion')) return 'motion';
        },
      },
    },
  },
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
