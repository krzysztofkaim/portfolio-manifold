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
  "connect-src 'self'; " +
  "worker-src 'self' blob:; " +
  "object-src 'none'; " +
  "base-uri 'self'; " +
  "frame-ancestors 'none'; " +
  'upgrade-insecure-requests';

export const securityHeaders = {
  ...crossOriginIsolationHeaders,
  'Content-Security-Policy': contentSecurityPolicy,
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Permissions-Policy': permissionsPolicy,
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY'
};

export const cloudflareHeaderRules = [
  {
    route: '/*',
    headers: securityHeaders
  },
  {
    route: '/_astro/*',
    headers: {
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  }
];

export function renderCloudflareHeadersFile(rules = cloudflareHeaderRules) {
  const sections = ['# Generated from config/securityHeaders.mjs'];

  for (const rule of rules) {
    sections.push(
      rule.route,
      ...Object.entries(rule.headers).map(([name, value]) => `  ${name}: ${value}`)
    );
  }

  return `${sections.join('\n')}\n`;
}
