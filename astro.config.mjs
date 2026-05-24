import { defineConfig } from 'astro/config';
import { visualizer } from 'rollup-plugin-visualizer';
import { securityHeaders } from './config/securityHeaders.mjs';

const DEFAULT_SITE_URL = 'https://kaim.dev';
const analyze = process.env.ANALYZE === 'true';
const DELETED_REDIRECT_STYLE_REQUEST = '/src/components/SilentRedirectPage.astro?astro&type=style&index=0&lang.css';

function absorbDeletedRedirectStyleRequest() {
  const isDeletedRedirectStyleRequest = (id) => id.includes(DELETED_REDIRECT_STYLE_REQUEST);

  return {
    name: 'local:absorb-deleted-redirect-style-request',
    apply: 'serve',
    enforce: 'pre',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url || !isDeletedRedirectStyleRequest(req.url)) {
          next();
          return;
        }

        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
        res.end('');
      });
    },
    resolveId(id) {
      return isDeletedRedirectStyleRequest(id) ? id : null;
    },
    load(id) {
      return isDeletedRedirectStyleRequest(id) ? '' : null;
    }
  };
}

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL ?? DEFAULT_SITE_URL,
  devToolbar: {
    enabled: false
  },
  vite: {
    optimizeDeps: {
      exclude: ['@studio-freight/lenis']
    },
    plugins: [
      absorbDeletedRedirectStyleRequest(),
      ...(analyze
        ? [
          visualizer({
            filename: 'reports/bundle-treemap.html',
            template: 'treemap',
            gzipSize: true,
            brotliSize: true
          }),
          visualizer({
            filename: 'reports/bundle-stats.json',
            template: 'raw-data',
            gzipSize: true,
            brotliSize: true
          })
        ]
        : [])
    ],
    build: {
      target: 'esnext'
    },
    worker: { format: 'es' },
    server: {
      host: true,
      headers: securityHeaders
    },
    preview: {
      host: true,
      headers: securityHeaders
    }
  }
});
