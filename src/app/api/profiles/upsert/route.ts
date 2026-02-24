import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

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
    experience = null,
  } = await req.json();

  if (!slug || !first_name || !last_name || !job_title || !description_html || !email) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Normalize clients to string[]
  const clientsArr: string[] = Array.isArray(clients)
    ? clients.map((c: unknown) => String(c)).filter(Boolean)
    : [];

  try {
    await db.query(`
      INSERT INTO profiles (
        slug, first_name, last_name, job_title, description_html,
        clients, photo_url, email, status, experience, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      ON CONFLICT (slug) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        job_title = EXCLUDED.job_title,
        description_html = EXCLUDED.description_html,
        clients = EXCLUDED.clients,
        photo_url = EXCLUDED.photo_url,
        email = EXCLUDED.email,
        status = EXCLUDED.status,
        experience = EXCLUDED.experience,
        updated_at = EXCLUDED.updated_at
    `, [
      slug,
      first_name,
      last_name,
      job_title,
      description_html,
      clientsArr,
      photo_url || null,
      email,
      status,
      experience || null
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 400 });
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
