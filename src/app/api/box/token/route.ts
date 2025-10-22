import { NextResponse } from 'next/server';
import { createRequire } from 'module';

/**
 * Minimal types to avoid any for Box SDK usage
 */
type BoxDownscopeResult = { accessToken: string; expires_in?: number };

type JwtConfigCtor = new (
  cfg: {
    clientID: string;
    clientSecret: string;
    appAuth: { keyID: string; privateKey: string; passphrase: string };
    enterpriseID: string;
  },
  tokenStorage?: unknown
) => unknown;

type BoxJwtAuthCtor = new (cfg: unknown) => {
  downscopeToken: (scopes: string[], resource: string) => Promise<BoxDownscopeResult>;
};

type BoxDeveloperTokenAuthCtor = new (token: string) => {
  downscopeToken?: (scopes: string[], resource: string) => Promise<BoxDownscopeResult>;
};

type InMemoryTokenStorageCtor = new () => unknown;

/**
 * POST /api/box/token
 * Body: { folderId: string }
 * Returns a short-lived downscoped access token with read/preview scopes for the given folder.
 */
export async function POST(req: Request) {
  try {
    const { folderId } = (await req.json()) as { folderId?: string };
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

    // CommonJS require for box-node-sdk (class-based API)
    const cjsRequire = createRequire(process.cwd() + '/');
    const mod = cjsRequire('box-node-sdk') as Record<string, unknown>;

    const BoxDeveloperTokenAuth = mod.BoxDeveloperTokenAuth as BoxDeveloperTokenAuthCtor | undefined;
    const BoxJwtAuth = mod.BoxJwtAuth as BoxJwtAuthCtor | undefined;
    const JwtConfig = mod.JwtConfig as JwtConfigCtor | undefined;
    const InMemoryTokenStorage = mod.InMemoryTokenStorage as InMemoryTokenStorageCtor | undefined;

    // Optional: developer token path (local testing)
    if (BOX_DEVELOPER_TOKEN && BoxDeveloperTokenAuth) {
      const authDev = new BoxDeveloperTokenAuth(BOX_DEVELOPER_TOKEN);
      if (typeof authDev.downscopeToken === 'function') {
        const ds = await authDev.downscopeToken(
          ['item_preview', 'item_download'],
          `https://api.box.com/2.0/folders/${folderId}`
        );
        return NextResponse.json({
          token: ds.accessToken,
          expiresIn: ds.expires_in ?? 3600,
        });
      }
      // Fallback to raw developer token
      return NextResponse.json({ token: BOX_DEVELOPER_TOKEN, expiresIn: 3600 });
    }

    // Validate required JWT envs for server auth
    if (
      !BOX_CLIENT_ID ||
      !BOX_CLIENT_SECRET ||
      !BOX_ENTERPRISE_ID ||
      !BOX_JWT_PRIVATE_KEY ||
      !BOX_JWT_PASSPHRASE ||
      !BoxJwtAuth ||
      !JwtConfig
    ) {
      return NextResponse.json(
        {
          error:
            'Box server auth misconfigured: env vars or SDK classes missing (required: BOX_CLIENT_ID/SECRET/ENTERPRISE_ID/JWT_PRIVATE_KEY/JWT_PASSPHRASE)',
        },
        { status: 500 }
      );
    }

    // Build JwtConfig (optionally with in-memory token storage)
    const tokenStorage = InMemoryTokenStorage ? new InMemoryTokenStorage() : undefined;
    const jwtCfg = tokenStorage
      ? new JwtConfig(
          {
            clientID: BOX_CLIENT_ID,
            clientSecret: BOX_CLIENT_SECRET,
            appAuth: {
              keyID: PUBLIC_KEY_ID,
              privateKey: PRIVATE_KEY,
              passphrase: BOX_JWT_PASSPHRASE,
            },
            enterpriseID: BOX_ENTERPRISE_ID,
          },
          tokenStorage
        )
      : new JwtConfig({
          clientID: BOX_CLIENT_ID,
          clientSecret: BOX_CLIENT_SECRET,
          appAuth: {
            keyID: PUBLIC_KEY_ID,
            privateKey: PRIVATE_KEY,
            passphrase: BOX_JWT_PASSPHRASE,
          },
          enterpriseID: BOX_ENTERPRISE_ID,
        });

    // Instantiate JWT auth and downscope to preview/download for requested folder
    const auth = new BoxJwtAuth(jwtCfg);
    const tokenResponse = await auth.downscopeToken(
      ['item_preview', 'item_download'],
      `https://api.box.com/2.0/folders/${folderId}`
    );

    return NextResponse.json({
      token: tokenResponse.accessToken,
      expiresIn: tokenResponse.expires_in ?? 3600,
    });
  } catch (err) {
    // Keep error typed as unknown to satisfy no-explicit-any
    // eslint-disable-next-line no-console
    console.error('Box token error:', err);
    return NextResponse.json({ error: 'Failed to create Box token' }, { status: 500 });
  }
}
