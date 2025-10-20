import { NextResponse } from 'next/server';
import { supaAdmin } from '@/supabaseAdmin';

export async function POST(req: Request) {
  const key = req.headers.get('x-edit-token');
  if (key !== process.env.EDIT_TOKEN)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { slug, title, summary, body_md, parent_slug, audience = ['All'], status = 'approved' } = await req.json();

  const { error } = await supaAdmin.from('policies').upsert({
    slug, title, summary, body_md, parent_slug: parent_slug || null, audience, status, updated_at: new Date().toISOString()
  }, { onConflict: 'slug' });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
