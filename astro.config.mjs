import { defineConfig } from 'astro/config';
import { visualizer } from 'rollup-plugin-visualizer';

const crossOriginIsolationHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp'
};
const contentSecurityPolicy =
  "default-src 'self'; " +
  "script-src 'self' 'wasm-unsafe-eval'; " +
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
  "font-src 'self' https://fonts.gstatic.com data:; " +
  "img-src 'self' data: blob:; " +
  "connect-src 'self' https://fonts.googleapis.com; " +
  "worker-src 'self' blob:; " +
  "object-src 'none'; " +
  "base-uri 'self'; " +
  "frame-ancestors 'none'";
const securityHeaders = {
  ...crossOriginIsolationHeaders,
  'Content-Security-Policy': contentSecurityPolicy
};

const DEFAULT_SITE_URL = 'https://kaim.dev';

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
      visualizer({
        filename: 'dist/bundle-treemap.html',
        template: 'treemap',
        gzipSize: true,
        brotliSize: true
      }),
      visualizer({
        filename: 'dist/bundle-stats.json',
        template: 'raw-data',
        gzipSize: true,
        brotliSize: true
      })
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
