import { NextResponse } from 'next/server';
import 'server-only';

export const runtime = 'nodejs';

type BoxDownscopeResult = { accessToken: string; expires_in?: number };

// Minimal types to avoid any
type UnknownCtor = new (cfg: Record<string, unknown>) => unknown;

type AppAuthClient = {
  exchangeToken: (scopes: string[], resource: string) => Promise<BoxDownscopeResult>;
};

type SDKInstance = {
  getAppAuthClient: (type: 'enterprise' | 'user', id: string) => AppAuthClient;
};

/**
 * POST /api/box/token
 * Body: { folderId: string }
 * Returns a short-lived downscoped access token with read/preview scopes for the given folder.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { folderId?: string };
    const folderId = body?.folderId;
    if (!folderId) {
      return NextResponse.json({ error: 'folderId required' }, { status: 400 });
    }

    const {
      BOX_CLIENT_ID,
      BOX_CLIENT_SECRET,
      BOX_ENTERPRISE_ID,
      BOX_JWT_PRIVATE_KEY,
      BOX_JWT_PASSPHRASE,
      BOX_JWT_PUBLIC_KEY_ID,
      BOX_DEVELOPER_TOKEN,
    } = process.env;

    // Normalize multiline private key when provided via env with escaped \n characters
    const PRIVATE_KEY =
      (BOX_JWT_PRIVATE_KEY || '').includes('\\n')
        ? (BOX_JWT_PRIVATE_KEY as string).replace(/\\n/g, '\n')
        : (BOX_JWT_PRIVATE_KEY || '');
    const PUBLIC_KEY_ID = BOX_JWT_PUBLIC_KEY_ID || '';

    // Prefer dynamic import so Next packs the server chunk correctly on Node runtime
    const { default: BoxSDK } = await import('box-node-sdk');
    const BoxSDKCtor = BoxSDK as unknown as UnknownCtor;


    // Validate required JWT envs for server auth
    if (
      !BOX_CLIENT_ID ||
      !BOX_CLIENT_SECRET ||
      !BOX_ENTERPRISE_ID ||
      !BOX_JWT_PRIVATE_KEY ||
      !BOX_JWT_PASSPHRASE
    ) {
      return NextResponse.json(
        {
          error:
            'Box server auth misconfigured: env vars missing (BOX_CLIENT_ID/SECRET/ENTERPRISE_ID/JWT_PRIVATE_KEY/JWT_PASSPHRASE).',
        },
        { status: 500 }
      );
    }

    // Instantiate SDK (class constructor form) and get App Auth client
    const sdkUnknown = new BoxSDKCtor({
      clientID: BOX_CLIENT_ID,
      clientSecret: BOX_CLIENT_SECRET,
      appAuth: {
        keyID: PUBLIC_KEY_ID,
        privateKey: PRIVATE_KEY,
        passphrase: BOX_JWT_PASSPHRASE,
      },
    }) as unknown;

    if (!sdkUnknown || typeof (sdkUnknown as Record<string, unknown>).getAppAuthClient !== 'function') {
      return NextResponse.json(
        { error: 'Box SDK misconfigured on server (getAppAuthClient not available)' },
        { status: 500 }
      );
    }
    const sdk = sdkUnknown as unknown as SDKInstance;

    const clientUnknown = (sdk as unknown as Record<string, unknown>).getAppAuthClient
      ? (sdk as unknown as SDKInstance).getAppAuthClient('enterprise', BOX_ENTERPRISE_ID)
      : undefined;

    if (!clientUnknown || typeof (clientUnknown as Record<string, unknown>).exchangeToken !== 'function') {
      return NextResponse.json(
        { error: 'Box SDK misconfigured on server (exchangeToken not available)' },
        { status: 500 }
      );
    }
    const client = clientUnknown as AppAuthClient;

    // Downscope to preview/download for the requested folder
    const tokenResponse = await client.exchangeToken(
      ['item_preview', 'item_download'],
      `https://api.box.com/2.0/folders/${folderId}`
    );

    return NextResponse.json({
      token: tokenResponse.accessToken,
      expiresIn: tokenResponse.expires_in ?? 3600,
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
          'Verify BOX_CLIENT_ID/BOX_CLIENT_SECRET/BOX_ENTERPRISE_ID/BOX_JWT_PRIVATE_KEY/BOX_JWT_PASSPHRASE/BOX_JWT_PUBLIC_KEY_ID on Vercel. Ensure PUBLIC_KEY_ID (KID) matches the key in Box app.',
      },
      { status: 500 }
    );
  }
}
