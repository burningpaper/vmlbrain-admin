import { createRequire } from 'module';

const req = createRequire(import.meta.url);
const mod: any = req('box-node-sdk');

function typeOf(v: any) {
  const t = typeof v;
  if (t !== 'function' && t !== 'object') return t;
  if (v === null) return 'null';
  const name = v && v.constructor && v.constructor.name;
  return `${t}${name ? `(${name})` : ''}`;
}

console.log('module typeof:', typeof mod);
console.log('module keys:', Object.keys(mod));

const inspectKeys = [
  'default',
  'JwtConfig',
  'BoxJwtAuth',
  'InMemoryTokenStorage',
  'CcgConfig',
  'BoxCcgAuth',
  'BoxDeveloperTokenAuth',
  'BoxOAuth',
  'OAuthConfig',
  'BoxClient',
];

for (const k of inspectKeys) {
  const v = (mod as any)[k];
  const dv = (mod as any)?.default?.[k];
  console.log(`key ${k}:`, typeOf(v), v ? 'present' : 'missing');
  console.log(`default.${k}:`, typeOf(dv), dv ? 'present' : 'missing');
}

console.log('is constructor mod?', typeof mod === 'function');
console.log('is constructor default?', typeof (mod as any)?.default === 'function');
