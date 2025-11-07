import { NextResponse } from 'next/server';

// Verify an RS256 JWT using Web Crypto (works on Node 18+ and Edge runtimes)
async function importPublicKeyFromPem(pem: string): Promise<CryptoKey> {
  // Expect PEM like -----BEGIN PUBLIC KEY----- base64 -----END PUBLIC KEY-----
  const clean = pem.replace(/-----BEGIN PUBLIC KEY-----/g, '')
    .replace(/-----END PUBLIC KEY-----/g, '')
    .replace(/\s+/g, '');
  const der = Uint8Array.from(atob(clean), (c) => c.charCodeAt(0)).buffer;
  return crypto.subtle.importKey(
    'spki',
    der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );
}

function b64urlToUint8(input: string): Uint8Array {
  const pad = (s: string) => s + '==='.slice((s.length + 3) % 4);
  const base64 = pad(input.replace(/-/g, '+').replace(/_/g, '/'));
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function verifyJwtRS256(token: string, publicKeyPem: string): Promise<{ valid: boolean; payload?: any; error?: string }> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return { valid: false, error: 'Malformed JWT' };
    const [h, p, s] = parts;

    const header = JSON.parse(new TextDecoder().decode(b64urlToUint8(h)));
    if (header.alg !== 'RS256') return { valid: false, error: 'Unexpected alg' };

    const payloadJson = new TextDecoder().decode(b64urlToUint8(p));
    const payload = JSON.parse(payloadJson);

    const dataBytes = new TextEncoder().encode(`${h}.${p}`);
    const sigBytes = b64urlToUint8(s);

    // Ensure ArrayBuffer views for WebCrypto (avoid TS BufferSource typing issues)
    const dataBuf = dataBytes.buffer.slice(dataBytes.byteOffset, dataBytes.byteOffset + dataBytes.byteLength);
    const sigBuf = sigBytes.buffer.slice(sigBytes.byteOffset, sigBytes.byteOffset + sigBytes.byteLength);

    const key = await importPublicKeyFromPem(publicKeyPem);
    // Convert to ArrayBuffer to satisfy BufferSource typing
    const sigAB = new Uint8Array(sigBytes).buffer as ArrayBuffer;
    const dataAB = new Uint8Array(dataBytes).buffer as ArrayBuffer;
    const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, sigAB, dataAB);
    if (!ok) return { valid: false, error: 'Signature verify failed' };

    // Basic exp check if present
    if (typeof payload.exp === 'number') {
      const nowSec = Math.floor(Date.now() / 1000);
      if (payload.exp < nowSec) return { valid: false, error: 'Token expired' };
    }

    return { valid: true, payload };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { valid: false, error: msg };
  }
}

// GET /api/auth/callback?token=...&returnTo=...
// Verifies the JWT from your intranet SSO and sets a secure session cookie (kb_sso) with the JWT.
// On success, redirects to returnTo or /.
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    const returnTo = url.searchParams.get('returnTo') || '/';

    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }
    const pub = process.env.INTRANET_JWT_PUBLIC_KEY;
    if (!pub) {
      return NextResponse.json({ error: 'Server misconfiguration: INTRANET_JWT_PUBLIC_KEY missing' }, { status: 500 });
    }

    const { valid, payload, error } = await verifyJwtRS256(token, pub);
    if (!valid || !payload) {
      return NextResponse.json({ error: 'Invalid token', detail: error }, { status: 401 });
    }

    // Optionally, enforce audience/issuer if your intranet provides them:
    // if (payload.iss !== process.env.INTRANET_JWT_ISS) ...
    // if (payload.aud !== process.env.INTRANET_JWT_AUD) ...

    // Determine cookie expiry from JWT exp if present (fall back to 8h)
    let maxAge = 60 * 60 * 8;
    if (typeof payload.exp === 'number') {
      const nowSec = Math.floor(Date.now() / 1000);
      const remain = payload.exp - nowSec;
      if (remain > 0) maxAge = Math.min(remain, 60 * 60 * 24);
    }

    const res = NextResponse.redirect(new URL(returnTo, url.origin));
    // Store the same intranet JWT as the session; middleware will verify it on each request.
    res.cookies.set('kb_sso', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge,
    });
    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
