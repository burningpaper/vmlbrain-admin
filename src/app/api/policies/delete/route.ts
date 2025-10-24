import { NextResponse } from 'next/server';
import { supaAdmin } from '@/lib/supabaseAdmin';

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

  // Best-effort cleanup of embeddings first
  const { error: embErr } = await supaAdmin
    .from('policy_embeddings')
    .delete()
    .eq('policy_slug', slug);

  if (embErr) {
    // Not fatal for deletion, but surface for visibility
    console.warn('Failed to delete embeddings for', slug, embErr.message);
  }

  // Delete the policy row
  const { error: delErr } = await supaAdmin
    .from('policies')
    .delete()
    .eq('slug', slug);

  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, deleted: slug });
}
