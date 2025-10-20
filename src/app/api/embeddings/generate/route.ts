import { NextResponse } from 'next/server';
import { supaAdmin } from '@/lib/supabaseAdmin';
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

    // Get the policy
    const { data: policy, error: policyError } = await supaAdmin
      .from('policies')
      .select('*')
      .eq('slug', slug)
      .single();

    if (policyError || !policy) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
    }

    // Init OpenAI client at runtime
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('OPENAI_API_KEY is not set');
      return NextResponse.json({ error: 'Server misconfiguration: OPENAI_API_KEY missing' }, { status: 500 });
    }
    const openai = new OpenAI({ apiKey });

    // Prepare content for embedding
    const fullText = `${policy.title}\n\n${policy.summary || ''}\n\n${stripHtml(policy.body_md || '')}`;
    
    // Chunk the content
    const chunks = chunkText(fullText);

    // Delete existing embeddings for this policy
    await supaAdmin
      .from('policy_embeddings')
      .delete()
      .eq('policy_slug', slug);

    // Generate embeddings for each chunk
    const embeddings = await Promise.all(
      chunks.map(async (chunk, index) => {
        const response = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: chunk,
        });

        return {
          policy_id: policy.id,
          policy_slug: slug,
          chunk_index: index,
          content: chunk,
          embedding: response.data[0].embedding,
        };
      })
    );

    // Insert embeddings into database
    const { error: insertError } = await supaAdmin
      .from('policy_embeddings')
      .insert(embeddings);

    if (insertError) {
      console.error('Error inserting embeddings:', insertError);
      return NextResponse.json({ error: 'Failed to save embeddings' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      chunksCreated: chunks.length 
    });

  } catch (error: unknown) {
    console.error('Error generating embeddings:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ 
      error: message 
    }, { status: 500 });
  }
}
