import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Simple IPv4 allowlist support (CIDR or single IPs) for company-only access.
 * Configure env ALLOW_IP_RANGES as a comma-separated list, e.g.:
 *   ALLOW_IP_RANGES="203.0.113.0/24,198.51.100.25"
 * Behavior:
 * - If ALLOW_IP_RANGES is unset/empty, allow all (no restriction).
 * - /api/keepalive is always allowed (for GitHub Action pings).
 * - In development (NODE_ENV!=='production'), allow all.
 */






/**
 * Force no-cache and enforce IP allowlist.
 */
export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Allow the keepalive endpoint unconditionally (scheduler pings)
  if (req.nextUrl.pathname.startsWith('/api/keepalive')) {
    return NextResponse.next();
  }

  // Allow authenticated API imports (edit token) to bypass SSO enforcement
  if (path.startsWith('/api')) {
    const editToken = req.headers.get('x-edit-token');
    if (editToken && process.env.EDIT_TOKEN && editToken === process.env.EDIT_TOKEN) {
      return NextResponse.next();
    }
  }

  // Enforce SSO session if configured: require kb_sso cookie in production.
  // Redirects to your intranet SSO start URL with returnTo pointing back to our callback,
  // which will set the kb_sso cookie and redirect to the originally requested path.
  const ssoLoginUrl = process.env.SSO_LOGIN_URL || '';
  const isProdEnv = process.env.NODE_ENV === 'production';
  if (isProdEnv) {
    const isExempt =
      path.startsWith('/api/auth/callback') ||
      path.startsWith('/api/auth/logout') ||
      path.startsWith('/api/keepalive');

    const hasSession = Boolean(req.cookies.get('kb_sso')?.value);

    if (!isExempt && !hasSession) {
      if (ssoLoginUrl) {
        const origin = req.nextUrl.origin;
        const desired = `${req.nextUrl.pathname}${req.nextUrl.search}`;
        const callback = `${origin}/api/auth/callback?returnTo=${encodeURIComponent(desired)}`;
        const redirectTo = `${ssoLoginUrl}${ssoLoginUrl.includes('?') ? '&' : '?'}returnTo=${encodeURIComponent(callback)}`;
        return NextResponse.redirect(redirectTo);
      } else {
        // Fail closed if SSO is not configured in production
        return new NextResponse(
          `<html><head><meta charset="utf-8"><title>Access Restricted</title></head>
           <body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:2rem">
             <h1 style="margin:0 0 0.5rem">Access Restricted</h1>
             <p style="margin:0 0 1rem;color:#555">Access Restricted. Please access the Knowledge Base via Chronos http://chronos.vml.com</p>
           </body></html>`,
          { status: 401, headers: { 'content-type': 'text/html; charset=utf-8' } }
        );
      }
    }
  }

  // IP allowlist removed per request; relying solely on SSO enforcement.

  const res = NextResponse.next();

  // Diagnostics + cache-busting
  res.headers.set('X-Pathname', req.nextUrl.pathname);
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.headers.set('Pragma', 'no-cache');
  res.headers.set('Expires', '0');
  res.headers.set('CDN-Cache-Control', 'no-store');
  res.headers.set('Vercel-CDN-Cache-Control', 'no-store');

  return res;
}

/**
 * Apply to app pages and APIs, avoid static assets.
 */
export const config = {
  matcher: [
    '/',               // Home
    '/p/:path*',       // Article route
    '/admin',          // Admin editor
    '/files',          // Files preview
    '/api/:path*',     // All API routes
  ],
};
