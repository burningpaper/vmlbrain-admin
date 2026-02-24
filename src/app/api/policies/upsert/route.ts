import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  const key = req.headers.get('x-edit-token');
  if (key !== process.env.EDIT_TOKEN)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const {
    slug,
    title,
    summary,
    body_md,
    parent_slug,
    section_key = null,
    audience = ['All'],
    status = 'approved',
    box_folder_id = null,
    box_file_ids = null
  } = await req.json();

  try {
    await db.query(`
      INSERT INTO policies (
        slug, title, summary, body_md, parent_slug, section_key,
        audience, status, box_folder_id, box_file_ids, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      ON CONFLICT (slug) DO UPDATE SET
        title = EXCLUDED.title,
        summary = EXCLUDED.summary,
        body_md = EXCLUDED.body_md,
        parent_slug = EXCLUDED.parent_slug,
        section_key = EXCLUDED.section_key,
        audience = EXCLUDED.audience,
        status = EXCLUDED.status,
        box_folder_id = EXCLUDED.box_folder_id,
        box_file_ids = EXCLUDED.box_file_ids,
        updated_at = EXCLUDED.updated_at
    `, [
      slug,
      title,
      summary || null,
      body_md || null,
      parent_slug || null,
      section_key || null,
      audience,
      status,
      box_folder_id || null,
      box_file_ids || null
    ]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Auto-generate embeddings in the background (don't wait for it)
  if (process.env.OPENAI_API_KEY) {
    const requestUrl = new URL(req.url);
    // Always derive from the current request to avoid localhost port mismatches during dev.
    const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;
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
