import { NextResponse } from 'next/server';
import { createRequire } from 'module';
 // Box SDK loaded dynamically for ESM compatibility

/**
 * POST /api/box/token
 * Body: { folderId: string }
 * Returns a short-lived downscoped access token with read/preview scopes for the given folder.
 */
export async function POST(req: Request) {
  try {
    const { folderId } = await req.json();

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
    } = process.env;

    // Normalize multiline private key when provided via env with escaped \n characters
    const PRIVATE_KEY = (BOX_JWT_PRIVATE_KEY || '').includes('\\n')
      ? (BOX_JWT_PRIVATE_KEY as string).replace(/\\n/g, '\n')
      : (BOX_JWT_PRIVATE_KEY || '');

    const PUBLIC_KEY_ID = BOX_JWT_PUBLIC_KEY_ID || '';

    if (
      !BOX_CLIENT_ID ||
      !BOX_CLIENT_SECRET ||
      !BOX_ENTERPRISE_ID ||
      !BOX_JWT_PRIVATE_KEY ||
      !BOX_JWT_PASSPHRASE
    ) {
      return NextResponse.json(
        { error: 'Box env vars missing (BOX_CLIENT_ID/SECRET/ENTERPRISE_ID/JWT_PRIVATE_KEY/JWT_PASSPHRASE)' },
        { status: 500 }
      );
    }

    // Initialize Box SDK (Service Account / JWT) using a preconfigured instance
    const config = {
      boxAppSettings: {
        clientID: BOX_CLIENT_ID,
        clientSecret: BOX_CLIENT_SECRET,
        appAuth: {
          publicKeyID: PUBLIC_KEY_ID,
          privateKey: PRIVATE_KEY,
          passphrase: BOX_JWT_PASSPHRASE,
        },
      },
      enterpriseID: BOX_ENTERPRISE_ID,
    } as any;

    // Use CommonJS require for box-node-sdk (v3 API exposes classes instead of getPreconfiguredInstance)
    const cjsRequire = createRequire(process.cwd() + '/');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const BoxSDKMod: any = cjsRequire('box-node-sdk');
    const {
      BoxDeveloperTokenAuth,
      BoxJwtAuth,
      JwtConfig,
      BoxClient,
      InMemoryTokenStorage,
    } = BoxSDKMod;

    let client: any;

    // Developer token path (useful for initial local testing)
    const devToken = process.env.BOX_DEVELOPER_TOKEN;
    if (devToken && BoxDeveloperTokenAuth) {
      const auth = new BoxDeveloperTokenAuth(devToken);
      // Downscope if available, otherwise return dev token (local testing only)
      if (typeof (auth as any).downscopeToken === 'function') {
        const ds = await (auth as any).downscopeToken(
          ['item_preview', 'item_download'],
          `https://api.box.com/2.0/folders/${folderId}`
        );
        const accessToken = ds.accessToken;
        return NextResponse.json({ token: accessToken, expiresIn: ds.expires_in ?? 3600 });
      }
      return NextResponse.json({ token: devToken, expiresIn: 3600 });
    } else if (BoxJwtAuth && JwtConfig) {
      // JWT (Server Authentication) path using class-based API
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
      const auth = new BoxJwtAuth(jwtCfg);
      // Downscope to preview/download for the requested folder
      const tokenResponse = await (auth as any).downscopeToken(
        ['item_preview', 'item_download'],
        `https://api.box.com/2.0/folders/${folderId}`
      );
      const accessToken = tokenResponse.accessToken;
      return NextResponse.json({ token: accessToken, expiresIn: tokenResponse.expires_in ?? 3600 });
    } else {
      console.error('Box SDK classes unavailable. Module keys:', Object.keys(BoxSDKMod || {}));
      return NextResponse.json({ error: 'Box SDK misconfigured on server (classes missing)' }, { status: 500 });
    }

    // Exchange for a downscoped token limited to preview/download of the specified folder
    // Scopes list from Box docs for downscoped tokens; using conservative read scopes
    const scopes = ['item_preview', 'item_download'];
    const resource = `https://api.box.com/2.0/folders/${folderId}`;

    const tokenResponse = await client.exchangeToken(scopes, resource);
    const accessToken = tokenResponse.accessToken;

    return NextResponse.json({
      token: accessToken,
      expiresIn: tokenResponse.expires_in ?? 3600,
    });
  } catch (err) {
    console.error('Box token error:', err);
    return NextResponse.json({ error: 'Failed to create Box token' }, { status: 500 });
  }
}
