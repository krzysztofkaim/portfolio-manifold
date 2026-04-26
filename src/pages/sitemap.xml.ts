import type { APIRoute } from 'astro';

export const prerender = true;

export const GET: APIRoute = ({ site }) => {
  const baseUrl = site?.toString().replace(/\/$/, '') ?? 'https://krzysztof.net';
  const lastModified = new Date().toISOString();
  const urls = [
    {
      loc: `${baseUrl}/en/`,
      hreflang: 'en'
    },
    {
      loc: `${baseUrl}/pl/`,
      hreflang: 'pl'
    }
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  ${urls
    .map(
      (url) => `<url>
    <loc>${url.loc}</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${baseUrl}/en/" />
    <xhtml:link rel="alternate" hreflang="pl" href="${baseUrl}/pl/" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}/en/" />
    <changefreq>weekly</changefreq>
    <priority>${url.hreflang === 'en' ? '1.0' : '0.9'}</priority>
    <lastmod>${lastModified}</lastmod>
  </url>`
    )
    .join('\n')}
</urlset>`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8'
    }
  });
};
