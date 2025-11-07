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

// Convert IPv4 dotted string to number (0..2^32-1), returns null for invalid/IPv6
function ipv4ToInt(ip: string): number | null {
  if (!ip || ip.includes(':')) return null; // ignore IPv6 for now
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    const v = Number(p);
    if (!Number.isInteger(v) || v < 0 || v > 255) return null;
    n = (n << 8) + v;
  }
  return n >>> 0;
}

type Range = { start: number; end: number };

function parseRange(entry: string): Range | null {
  const val = entry.trim();
  if (!val) return null;
  if (val.includes('/')) {
    // CIDR
    const [base, maskStr] = val.split('/');
    const baseInt = ipv4ToInt(base || '');
    const maskBits = Number(maskStr);
    if (baseInt == null || !Number.isInteger(maskBits) || maskBits < 0 || maskBits > 32) return null;
    const mask = maskBits === 0 ? 0 : 0xffffffff << (32 - maskBits);
    const start = baseInt & (mask >>> 0);
    const end = start + (maskBits === 32 ? 0 : (1 << (32 - maskBits)) - 1);
    return { start: start >>> 0, end: end >>> 0 };
  } else {
    // Single IPv4
    const ipInt = ipv4ToInt(val);
    return ipInt == null ? null : { start: ipInt, end: ipInt };
  }
}

function isAllowedIp(ip: string, ranges: Range[]): boolean {
  const ipInt = ipv4ToInt(ip);
  if (ipInt == null) {
    // For IPv6 or invalid, deny when an allowlist exists
    return false;
  }
  for (const r of ranges) {
    if (ipInt >= r.start && ipInt <= r.end) return true;
  }
  return false;
}

function getClientIp(req: NextRequest): string | null {
  // Prefer X-Forwarded-For (left-most)
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  // Common alternatives set by proxies/CDN
  const xrip = req.headers.get('x-real-ip');
  if (xrip) return xrip;
  const cf = req.headers.get('cf-connecting-ip');
  if (cf) return cf;
  const xci = req.headers.get('x-client-ip');
  if (xci) return xci;
  return null;
}

/**
 * Force no-cache and enforce IP allowlist.
 */
export function middleware(req: NextRequest) {
  // Allow the keepalive endpoint unconditionally (scheduler pings)
  if (req.nextUrl.pathname.startsWith('/api/keepalive')) {
    return NextResponse.next();
  }

  // Enforce allowlist only if configured and in production
  const allowEnv = process.env.ALLOW_IP_RANGES || '';
  const isProd = process.env.NODE_ENV === 'production';
  if (allowEnv && isProd) {
    const ranges = allowEnv
      .split(',')
      .map((s) => parseRange(s))
      .filter((r): r is Range => !!r);

    if (ranges.length > 0) {
      const ip = getClientIp(req);
      if (!ip || !isAllowedIp(ip, ranges)) {
        return new NextResponse(
          `<html><head><meta charset="utf-8"><title>Access Restricted</title></head>
           <body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:2rem">
             <h1 style="margin:0 0 0.5rem">Access Restricted</h1>
             <p style="margin:0 0 1rem;color:#555">This portal is only available from the company network.</p>
             <small style="color:#888">Your IP: ${ip ?? 'unknown'}</small>
           </body></html>`,
          { status: 403, headers: { 'content-type': 'text/html; charset=utf-8' } }
        );
      }
    }
  }

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
