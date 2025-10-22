import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Force no-cache at the edge (Vercel CDN) for dynamic pages and APIs.
 * This complements page-level dynamic/revalidate settings and the Supabase
 * client no-store fetch override to guarantee fresh data on live.
 */
export function middleware(_req: NextRequest) {
  const res = NextResponse.next();

  // Standard cache-busting headers
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.headers.set('Pragma', 'no-cache');
  res.headers.set('Expires', '0');

  // Vercel/CDN-specific hints
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
