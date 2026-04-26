import { defineConfig } from 'astro/config';
import { visualizer } from 'rollup-plugin-visualizer';
import { securityHeaders } from './config/securityHeaders.mjs';

const DEFAULT_SITE_URL = 'https://kaim.dev';
const analyze = process.env.ANALYZE === 'true';

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL ?? DEFAULT_SITE_URL,
  devToolbar: {
    enabled: false
  },
  vite: {
    optimizeDeps: {
      exclude: ['@studio-freight/lenis']
    },
    plugins: analyze
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
      : [],
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
