import { NextResponse } from 'next/server';
import 'server-only';

export const runtime = 'nodejs';

type BoxDownscopeResult = { accessToken: string; expires_in?: number };

// Minimal types to avoid any

type AppAuthClient = {
  exchangeToken: (scopes: string[], resource: string) => Promise<BoxDownscopeResult>;
};

/* type SDKInstance = {
  getAppAuthClient: (type: 'enterprise' | 'user', id: string) => AppAuthClient;
}; */



/**
 * POST /api/box/token
 * Body: { folderId?: string; fileId?: string }
 * Returns a short-lived downscoped access token with read/preview scopes for the given folder or file.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { folderId?: string; fileId?: string };
    const norm = (v?: string | null) => {
      if (!v) return null;
      const m = v.toString().trim().match(/(\d+)(?:\/?$)/);
      return m ? m[1] : null;
    };

    const folderId = norm(body?.folderId);
    const fileId = norm(body?.fileId);

    if (!folderId && !fileId) {
      return NextResponse.json(
        {
          error: 'Invalid or missing folderId/fileId',
          hint:
            'Provide a numeric Box ID or a URL ending in /folders/{id} or /files/{id}. Shared-link URLs (/s/...) are not valid here.',
        },
        { status: 400 }
      );
    }

    const resourceUrl = folderId
      ? `https://api.box.com/2.0/folders/${folderId}`
      : `https://api.box.com/2.0/files/${fileId}`;

    const {
      BOX_CLIENT_ID,
      BOX_CLIENT_SECRET,
      BOX_ENTERPRISE_ID,
      BOX_JWT_PRIVATE_KEY,
      BOX_JWT_PASSPHRASE,
      BOX_JWT_PUBLIC_KEY_ID,
    } = process.env;

    // Normalize multiline private key when provided via env with escaped \n characters
    const PUBLIC_KEY_ID = BOX_JWT_PUBLIC_KEY_ID || '';

    // Using static import (BoxSDK); Next packs it via serverComponentsExternalPackages config


    // Validate required JWT envs for server auth
    if (
      !BOX_CLIENT_ID ||
      !BOX_CLIENT_SECRET ||
      !BOX_ENTERPRISE_ID ||
      !BOX_JWT_PRIVATE_KEY
    ) {
      return NextResponse.json(
        {
          error:
            'Box server auth misconfigured: env vars missing (BOX_CLIENT_ID/SECRET/ENTERPRISE_ID/JWT_PRIVATE_KEY).',
        },
        { status: 500 }
      );
    }

    // Pure HTTP flow using JWT assertion (JWT Bearer) + Token Exchange (no SDK).
    // This does NOT require CCG to be enabled; it uses your JWT keypair.
    const form = (data: Record<string, string>) =>
      Object.entries(data)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');

    // Helper: base64url
    const base64url = (input: Buffer | string) =>
      Buffer.from(input)
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

    // Helper: sign RS256 with Node crypto
    const { createSign, randomUUID } = await import('node:crypto');

    // 1) Build and sign a JWT assertion for Box (JWT Bearer)
    const header = {
      alg: 'RS256',
      typ: 'JWT',
      kid: PUBLIC_KEY_ID,
    };

    const now = Math.floor(Date.now() / 1000);
    const jti = randomUUID();

    const payload = {
      iss: BOX_CLIENT_ID,
      sub: BOX_ENTERPRISE_ID,
      box_sub_type: 'enterprise',
      aud: 'https://api.box.com/oauth2/token',
      jti,
      exp: now + 45, // 45 seconds
    };

    const encodedHeader = base64url(JSON.stringify(header));
    const encodedPayload = base64url(JSON.stringify(payload));
    const signingInput = `${encodedHeader}.${encodedPayload}`;

    const signer = createSign('RSA-SHA256');
    signer.update(signingInput);
    signer.end();

    // Normalize private key newlines
    const privateKeyPem =
      (BOX_JWT_PRIVATE_KEY || '').includes('\\n')
        ? (BOX_JWT_PRIVATE_KEY as string).replace(/\\n/g, '\n')
        : (BOX_JWT_PRIVATE_KEY as string);

    // Sign with passphrase only if provided; some runtimes (e.g. Vercel) reject certain encrypted key ciphers
    const signKey =
      BOX_JWT_PASSPHRASE && (BOX_JWT_PASSPHRASE as string).length > 0
        ? { key: privateKeyPem, passphrase: BOX_JWT_PASSPHRASE as string }
        : privateKeyPem;
    const signature = signer.sign(signKey, 'base64');
    const jwtAssertion = `${signingInput}.${signature
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')}`;

    // 2) Exchange JWT for an enterprise access token
    const jwtRes = await fetch('https://api.box.com/oauth2/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: form({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwtAssertion,
        client_id: BOX_CLIENT_ID as string,
        client_secret: BOX_CLIENT_SECRET as string,
      }),
    });

    const jwtJson = await jwtRes.json().catch(() => ({}));
    if (!jwtRes.ok || !jwtJson?.access_token) {
      return NextResponse.json(
        {
          error: 'JWT bearer token request failed',
          reason: jwtJson,
          hint:
            'Verify KID, private key, and passphrase; ensure Admin has approved the app; ensure enterprise ID is correct.',
        },
        { status: 500 }
      );
    }

    // Preflight: ensure the Service Account (enterprise token) can access the resource
    // This distinguishes "invalid_resource" (bad ID or no access) before attempting downscope
    try {
      const probeRes = await fetch(resourceUrl, {
        method: 'GET',
        headers: { Authorization: `Bearer ${jwtJson.access_token}` },
      });
      if (!probeRes.ok) {
        const probeJson = await probeRes.json().catch(() => ({}));
        return NextResponse.json(
          {
            error: 'Resource not accessible by Service Account',
            reason: probeJson,
            status: probeRes.status,
            hint:
              'Add the app Service Account as a collaborator (Viewer or above) on this folder/file, and ensure the ID is correct.',
          },
          { status: 400 }
        );
      }
    } catch {
      // If the probe fails (network etc.), proceed to token exchange which will still error with context
    }

    // 3) Downscope via RFC8693 Token Exchange to item_preview/item_download for the folder
    const exRes = await fetch('https://api.box.com/oauth2/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: form({
        grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
        subject_token: jwtJson.access_token as string,
        subject_token_type: 'urn:ietf:params:oauth:token-type:access_token',
        scope: 'base_explorer item_preview item_download',
        resource: resourceUrl,
        client_id: BOX_CLIENT_ID as string,
        client_secret: BOX_CLIENT_SECRET as string,
      }),
    });

    const exJson = await exRes.json().catch(() => ({}));
    if (!exRes.ok || !exJson?.access_token) {
      return NextResponse.json(
        {
          error: 'Token exchange (downscope) failed',
          reason: exJson,
          hint:
            'Ensure the resource exists and the Service Account has access; use /folders/{id} for folders or /files/{id} for files; app must have Read content scope.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      token: exJson.access_token as string,
      expiresIn: exJson.expires_in ?? 3600,
      used: 'jwt+token-exchange',
    });
  } catch (err) {
    // Try to surface a safe error message to help diagnose env/config issues on live
    let reason = 'unknown';
    if (err && typeof err === 'object') {
      const anyErr = err as Record<string, unknown>;
      // Box SDK errors can include response/response.body
      const body = anyErr?.response as { body?: unknown } | undefined;
      if (body?.body) {
        reason = JSON.stringify(body.body);
      } else if ('message' in anyErr && typeof anyErr.message === 'string') {
        reason = anyErr.message;
      } else {
        try {
          reason = JSON.stringify(anyErr);
        } catch {
          reason = String(err);
        }
      }
    } else {
      reason = String(err);
    }

    console.error('Box token error:', reason);
    return NextResponse.json(
      {
        error: 'Failed to create Box token',
        reason,
        hint:
          'Verify BOX_CLIENT_ID/BOX_CLIENT_SECRET/BOX_ENTERPRISE_ID/BOX_JWT_PRIVATE_KEY/BOX_JWT_PUBLIC_KEY_ID on Vercel (if using an encrypted key, also set BOX_JWT_PASSPHRASE). Ensure PUBLIC_KEY_ID (KID) matches the key in Box app.',
      },
      { status: 500 }
    );
  }
}
