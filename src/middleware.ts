import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  const url = context.url;
  if ((url.hostname === 'ruddafpark.com' && url.protocol === 'http:') || url.hostname === 'www.ruddafpark.com') {
    url.hostname = 'ruddafpark.com'; url.protocol = 'https:'; url.port = '';
    return Response.redirect(url, 301);
  }
  const response = await next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "form-action 'self'",
      "frame-ancestors 'self'",
      "img-src 'self' data:",
      "frame-src https://www.google.com",
      "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
      "connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com",
      "style-src 'self' 'unsafe-inline'"
    ].join('; ')
  );
  if (response.status === 404) response.headers.set('X-Robots-Tag', 'noindex, follow');
  return response;
});
