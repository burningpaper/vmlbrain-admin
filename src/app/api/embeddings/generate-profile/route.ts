import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import OpenAI from 'openai';

// Chunk text into smaller pieces for embedding
function chunkText(text: string, maxChunkSize: number = 1000): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/[.!?]+\s+/);

  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxChunkSize && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

// Strip HTML tags from content
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function POST(req: Request) {
  try {
    // Verify edit token
    const token = req.headers.get('x-edit-token');
    if (token !== process.env.EDIT_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { slug } = await req.json();

    if (!slug) {
      return NextResponse.json({ error: 'Slug required' }, { status: 400 });
    }

    // Get the profile
    const result = await db.query('SELECT * FROM profiles WHERE slug = $1', [slug]);
    const profile = result.rows[0];

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Init OpenAI client at runtime
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('OPENAI_API_KEY is not set');
      return NextResponse.json({ error: 'Server misconfiguration: OPENAI_API_KEY missing' }, { status: 500 });
    }
    const openai = new OpenAI({ apiKey });

    // Prepare content for embedding
    const nameLine = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
    const titleLine = profile.job_title ? ` — ${profile.job_title}` : '';
    const emailLine = profile.email ? `\n\n${profile.email}` : '';
    const clientsLine =
      Array.isArray(profile.clients) && profile.clients.length
        ? `\n\nClients: ${(profile.clients as string[]).join(', ')}`
        : '';
    const desc = stripHtml(profile.description_html || '');
    const fullText = `${nameLine}${titleLine}${emailLine}${clientsLine}\n\n${desc}`.trim();

    // Chunk the content
    const chunks = chunkText(fullText);

    // Delete existing embeddings for this profile
    await db.query('DELETE FROM profile_embeddings WHERE profile_slug = $1', [slug]);

    // Generate embeddings for each chunk
    const embeddings = await Promise.all(
      chunks.map(async (chunk, index) => {
        const response = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: chunk,
        });

        return {
          profile_id: profile.id,
          profile_slug: slug,
          chunk_index: index,
          content: chunk,
          embedding: response.data[0].embedding,
        };
      })
    );

    // Insert embeddings into database
    if (embeddings.length > 0) {
      const values = embeddings.map((_, i) => {
        const offset = i * 5;
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}::vector)`;
      }).join(', ');

      const params = embeddings.flatMap(e => [
        e.profile_id,
        e.profile_slug,
        e.chunk_index,
        e.content,
        `[${e.embedding.join(',')}]`
      ]);

      try {
        await db.query(`
          INSERT INTO profile_embeddings (profile_id, profile_slug, chunk_index, content, embedding)
          VALUES ${values}
        `, params);
      } catch (insertError) {
        console.error('Error inserting profile embeddings:', insertError);
        return NextResponse.json({ error: 'Failed to save profile embeddings' }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      chunksCreated: chunks.length,
    });
  } catch (error: unknown) {
    console.error('Error generating profile embeddings:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 }
    );
  }
}
