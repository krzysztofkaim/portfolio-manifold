export const crossOriginIsolationHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp'
};

export const permissionsPolicy =
  'autoplay=(self), camera=(), fullscreen=(self), geolocation=(), microphone=(), payment=(), usb=()';

export const contentSecurityPolicy =
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

export const securityHeaders = {
  ...crossOriginIsolationHeaders,
  'Content-Security-Policy': contentSecurityPolicy,
  'Permissions-Policy': permissionsPolicy,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY'
};

export function renderCloudflareHeadersFile(headers = securityHeaders, route = '/*') {
  const lines = [
    '# Generated from config/securityHeaders.mjs',
    route,
    ...Object.entries(headers).map(([name, value]) => `  ${name}: ${value}`)
  ];

  return `${lines.join('\n')}\n`;
}
