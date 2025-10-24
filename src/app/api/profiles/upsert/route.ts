import { NextResponse } from 'next/server';
import { supaAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: Request) {
  const key = req.headers.get('x-edit-token');
  if (key !== process.env.EDIT_TOKEN)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const {
    slug,
    first_name,
    last_name,
    job_title,
    description_html,
    clients = [],
    photo_url = null,
    email,
    status = 'approved',
  } = await req.json();

  if (!slug || !first_name || !last_name || !job_title || !description_html || !email) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Normalize clients to string[]
  const clientsArr: string[] = Array.isArray(clients)
    ? clients.map((c: unknown) => String(c)).filter(Boolean)
    : [];

  const { error } = await supaAdmin
    .from('profiles')
    .upsert(
      {
        slug,
        first_name,
        last_name,
        job_title,
        description_html,
        clients: clientsArr,
        photo_url: photo_url || null,
        email,
        status,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'slug' }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Trigger profile embeddings in background if OpenAI available
  if (process.env.OPENAI_API_KEY) {
    const requestUrl = new URL(req.url);
    const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;
    fetch(`${baseUrl}/api/embeddings/generate-profile`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-edit-token': key!,
      },
      body: JSON.stringify({ slug }),
    }).catch((err) => console.error('Background profile embedding generation failed:', err));
  }

  return NextResponse.json({ ok: true });
}
