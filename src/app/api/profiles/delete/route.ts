import { NextResponse } from 'next/server';
import { supaAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: Request) {
  const key = req.headers.get('x-edit-token');
  if (key !== process.env.EDIT_TOKEN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { slug } = await req.json().catch(() => ({} as { slug?: string }));
  if (!slug || typeof slug !== 'string') {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
  }

  // Best-effort cleanup of profile embeddings first
  const { error: embErr } = await supaAdmin
    .from('profile_embeddings')
    .delete()
    .eq('profile_slug', slug);

  if (embErr) {
    console.warn('Failed to delete profile embeddings for', slug, embErr.message);
  }

  // Delete the profile row
  const { error: delErr } = await supaAdmin
    .from('profiles')
    .delete()
    .eq('slug', slug);

  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, deleted: slug });
}
