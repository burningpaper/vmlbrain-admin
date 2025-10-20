import { NextResponse } from 'next/server';
import { supaAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: Request) {
  const key = req.headers.get('x-edit-token');
  if (key !== process.env.EDIT_TOKEN)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { slug, title, summary, body_md, parent_slug, audience = ['All'], status = 'approved' } = await req.json();

  const { error } = await supaAdmin.from('policies').upsert({
    slug, title, summary, body_md, parent_slug: parent_slug || null, audience, status, updated_at: new Date().toISOString()
  }, { onConflict: 'slug' });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Auto-generate embeddings in the background (don't wait for it)
  if (process.env.OPENAI_API_KEY) {
    const requestUrl = new URL(req.url);
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || `${requestUrl.protocol}//${requestUrl.host}`;
    fetch(`${baseUrl}/api/embeddings/generate`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-edit-token': key!,
      },
      body: JSON.stringify({ slug }),
    }).catch(err => console.error('Background embedding generation failed:', err));
  }

  return NextResponse.json({ ok: true });
}
