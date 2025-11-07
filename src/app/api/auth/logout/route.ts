import { NextResponse } from 'next/server';

// Clears the kb_sso cookie and redirects to SSO_LOGOUT_URL (if set) or home.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;
  const redirectTarget =
    process.env.SSO_LOGOUT_URL && process.env.SSO_LOGOUT_URL.length > 0
      ? process.env.SSO_LOGOUT_URL
      : `${origin}/`;

  const res = NextResponse.redirect(redirectTarget);
  // Clear cookie immediately
  res.cookies.set('kb_sso', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return res;
}
