import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function bibleIndexPlugin() {
  return {
    name: 'bible-index',
    enforce: 'pre' as const,
    configureServer(server: {
      middlewares: { use: (fn: (req: any, res: any, next: () => void) => void) => void; stack: Array<{ route: string; handle: Function }> };
    }) {
      const handler = (req: any, res: any, next: () => void) => {
        if (req.url === '/' || req.url === '/index.html') {
          req.url = '/index-bible.html';
        }
        next();
      };
      server.middlewares.stack.unshift({ route: '', handle: handler });
    },
  };
}

export default defineConfig({
  plugins: [bibleIndexPlugin(), react()],
  optimizeDeps: {
    exclude: ['shared'],
  },
  build: {
    rollupOptions: {
      input: 'index-bible.html',
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5180,
    strictPort: true,
    open: true,
    proxy: {
      '/api': { target: 'http://localhost:5005', changeOrigin: true },
    },
  },
});
