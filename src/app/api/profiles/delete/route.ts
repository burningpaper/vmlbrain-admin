import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  const key = req.headers.get('x-edit-token');
  if (key !== process.env.EDIT_TOKEN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { slug } = await req.json().catch(() => ({} as { slug?: string }));
  if (!slug || typeof slug !== 'string') {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
  }

  try {
    // Best-effort cleanup of profile embeddings first
    await db.query('DELETE FROM profile_embeddings WHERE profile_slug = $1', [slug]);

    // Delete the profile row
    const result = await db.query('DELETE FROM profiles WHERE slug = $1 RETURNING slug', [slug]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, deleted: slug });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
