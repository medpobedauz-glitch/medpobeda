import { defineConfig } from 'vite';

const PAGES = 'home|about|anatomy-3d|curricula|subjects|faculty|platform|qbank|tests|plans|app|contact|login|register';
const PUBLIC_ROUTE = new RegExp('^\\/(uz|ru|en)(\\/?|\\/(' + PAGES + ')\\/?|\\/learn\\/[^/]+\\/[^/]+\\/?|\\/legal\\/(privacy|terms|subscription)\\/?)$');

function multilingualRoutes() {
  return {
    name: 'multilingual-routes',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (PUBLIC_ROUTE.test(req.url.split('?')[0])) {
          req.url = '/index.html';
        }
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (PUBLIC_ROUTE.test(req.url.split('?')[0])) {
          req.url = '/index.html';
        }
        next();
      });
    },
  };
}

export default defineConfig({
  root: '.',
  publicDir: 'public',
  plugins: [multilingualRoutes()],
    build: {
    outDir: 'dist',
  },
  server: {
    port: 3000,
    open: false,
    // Proxy API and media requests to the Express backend during development.
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true, secure: false },
      '/media': { target: 'http://localhost:4000', changeOrigin: true, secure: false },
    },
  },
  preview: {
    port: 4173,
  },
});

