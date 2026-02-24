import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  // Token gated, consistent with upsert route
  const key = req.headers.get('x-edit-token');
  if (key !== process.env.EDIT_TOKEN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { slug } = await req.json().catch(() => ({} as { slug?: string }));
  if (!slug || typeof slug !== 'string') {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
  }

  try {
    // Best-effort cleanup of embeddings first (cascade delete should handle this, but be explicit)
    await db.query('DELETE FROM policy_embeddings WHERE policy_slug = $1', [slug]);

    // Delete the policy row
    const result = await db.query('DELETE FROM policies WHERE slug = $1 RETURNING slug', [slug]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, deleted: slug });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
