/**
 * Intestazioni di sicurezza messe su ogni risposta del sito (vedi src/server.ts).
 */
export function applySecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  // Nessun altro sito può mostrare queste pagine dentro una cornice.
  headers.set(
    'Content-Security-Policy',
    "default-src 'self'; " +
      // Paddle: lo script del pagamento e la finestra in cui il cliente paga.
      "script-src 'self' 'unsafe-inline' https://cdn.paddle.com https://sandbox-cdn.paddle.com https://public.profitwell.com " +
      // Google Tag Manager, Analytics e Ads: caricati solo se configurati nella regia.
      "https://www.googletagmanager.com https://www.google-analytics.com https://googleads.g.doubleclick.net https://www.googleadservices.com https://www.google.com; " +
      "frame-src 'self' https://buy.paddle.com https://sandbox-buy.paddle.com https://www.googletagmanager.com https://td.doubleclick.net https://www.google.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.paddle.com https://sandbox-cdn.paddle.com; " +
      "font-src 'self' https://fonts.gstatic.com; " +
      "img-src 'self' data: https:; media-src 'self' https:; " +
      "connect-src 'self' https:; " +
      "base-uri 'self'; form-action 'self'; frame-ancestors 'self'",
  );
  headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'SAMEORIGIN');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  headers.set('X-XSS-Protection', '0');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
