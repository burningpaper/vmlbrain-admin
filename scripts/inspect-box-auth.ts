import { createRequire } from 'module';

const {
  BOX_CLIENT_ID,
  BOX_CLIENT_SECRET,
  BOX_ENTERPRISE_ID,
  BOX_JWT_PRIVATE_KEY,
  BOX_JWT_PASSPHRASE,
  BOX_JWT_PUBLIC_KEY_ID,
} = process.env;

const req = createRequire(import.meta.url);
const mod: any = req('box-node-sdk');

function safeType(v: any) {
  if (v === null) return 'null';
  const t = typeof v;
  if (t !== 'object' && t !== 'function') return t;
  const name = v?.constructor?.name;
  return `${t}${name ? `(${name})` : ''}`;
}

console.log('SDK keys:', Object.keys(mod));

const JwtConfig = mod?.JwtConfig;
const BoxJwtAuth = mod?.BoxJwtAuth;
const InMemoryTokenStorage = mod?.InMemoryTokenStorage;
const CcgConfig = mod?.CcgConfig;
const BoxCcgAuth = mod?.BoxCcgAuth;

console.log('JwtConfig:', safeType(JwtConfig));
console.log('BoxJwtAuth:', safeType(BoxJwtAuth));
console.log('InMemoryTokenStorage:', safeType(InMemoryTokenStorage));
console.log('CcgConfig:', safeType(CcgConfig));
console.log('BoxCcgAuth:', safeType(BoxCcgAuth));

// Build payloads and probe method shapes without making network calls
try {
  if (CcgConfig && BoxCcgAuth) {
    const ccgCfg = new CcgConfig({
      clientID: BOX_CLIENT_ID,
      clientSecret: BOX_CLIENT_SECRET,
      enterpriseID: BOX_ENTERPRISE_ID,
    });
    const ccgAuth = new BoxCcgAuth(ccgCfg);
    console.log('ccgAuth methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(ccgAuth)));
    console.log('ccgAuth.downscopeToken typeof:', typeof (ccgAuth as any).downscopeToken);
    console.log('ccgAuth.getEnterpriseAccessToken typeof:', typeof (ccgAuth as any).getEnterpriseAccessToken);
  } else {
    console.log('CCG classes not available to instantiate');
  }
} catch (e) {
  console.log('CCG instantiate error:', e instanceof Error ? e.message : e);
}

try {
  if (JwtConfig && BoxJwtAuth) {
    const storage = InMemoryTokenStorage ? new InMemoryTokenStorage() : undefined;
    const jwtBase = {
      clientID: BOX_CLIENT_ID,
      clientSecret: BOX_CLIENT_SECRET,
      appAuth: {
        keyID: BOX_JWT_PUBLIC_KEY_ID,
        privateKey: (BOX_JWT_PRIVATE_KEY || '').includes('\\n')
          ? (BOX_JWT_PRIVATE_KEY as string).replace(/\\n/g, '\n')
          : BOX_JWT_PRIVATE_KEY,
        passphrase: BOX_JWT_PASSPHRASE,
      },
      enterpriseID: BOX_ENTERPRISE_ID,
    };
    // Try both ctor styles
    let jwtAuth: any;
    try {
      if (storage) {
        const jwtCfg = new JwtConfig(jwtBase, storage);
        jwtAuth = new BoxJwtAuth(jwtCfg, storage);
      } else {
        const jwtCfg = new JwtConfig(jwtBase);
        jwtAuth = new BoxJwtAuth(jwtCfg);
      }
    } catch (e) {
      console.log('JwtAuth create with JwtConfig failed:', e instanceof Error ? e.message : e);
      try {
        jwtAuth = new BoxJwtAuth({ ...jwtBase, tokenStorage: storage });
      } catch (e2) {
        console.log('JwtAuth create with plain object failed:', e2 instanceof Error ? e2.message : e2);
      }
    }
    if (jwtAuth) {
      console.log('jwtAuth methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(jwtAuth)));
      console.log('jwtAuth.downscopeToken typeof:', typeof jwtAuth.downscopeToken);
      console.log('jwtAuth.getEnterpriseAccessToken typeof:', typeof (jwtAuth as any).getEnterpriseAccessToken);
    } else {
      console.log('jwtAuth not instantiated');
    }
  } else {
    console.log('JWT classes not available to instantiate');
  }
} catch (e) {
  console.log('JWT instantiate error:', e instanceof Error ? e.message : e);
}
