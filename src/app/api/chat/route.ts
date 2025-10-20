import { NextResponse } from 'next/server';
import { supaAdmin } from '@/lib/supabaseAdmin';
import OpenAI from 'openai';


type PolicyMatch = { policy_slug: string; content: string; chunk_index?: number; id?: number; similarity?: number };
type PolicyMeta = { slug: string; title: string };
type KPolicy = { slug: string; title: string; summary: string | null; body_md: string | null };

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 });
    }

    // Init OpenAI client
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('OPENAI_API_KEY is not set');
      return NextResponse.json({ error: 'Server misconfiguration: OPENAI_API_KEY missing' }, { status: 500 });
    }
    const openai = new OpenAI({ apiKey });

    // Generate embedding for the question
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: message,
    });

    const questionEmbedding = embeddingResponse.data[0].embedding;

    // Search for similar policy chunks using the match_policy_embeddings function
    const { data: matches, error: searchError } = await supaAdmin
      .rpc('match_policy_embeddings', {
        query_embedding: questionEmbedding,
        match_threshold: 0.35,
        match_count: 10,
      });

    if (searchError) {
      console.error('Search error:', searchError);
      return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }

    if (!matches || matches.length === 0) {
      // Fallback: simple keyword search over policies if vector search returns nothing
      const tokens = (message.toLowerCase().match(/[a-z0-9]+/g) || []) as string[];
      const keywords = Array.from(new Set(tokens.filter(w => w.length >= 3))).slice(0, 5);
      const clean = (s: string) => (s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

      if (keywords.length > 0) {
        const baseTerms = keywords;
        const synonyms: string[] = [];
        const lc = message.toLowerCase();
        if (lc.includes('work hour') || (lc.includes('work') && lc.includes('hour'))) {
          synonyms.push(
            'work hours',
            'working hours',
            'business hours',
            'hours of work',
            'office hours',
            'core hours',
            'operating hours',
            'standard hours',
            'working time',
            'work schedule',
            'start time',
            'end time',
            '9-5',
            '9 to 5'
          );
        }
        const terms = Array.from(new Set([...baseTerms, ...synonyms]));
        const orFilter = terms
          .map(t => `title.ilike.%${t}%,summary.ilike.%${t}%,body_md.ilike.%${t}%`)
          .join(',');

        const { data: kwPolicies, error: kwError } = await supaAdmin
          .from('policies')
          .select('slug, title, summary, body_md')
          .or(orFilter)
          .limit(5);

        if (!kwError && kwPolicies && kwPolicies.length > 0) {
          const kps = (kwPolicies as KPolicy[] | null) || [];
          const fallbackContext = kps
            .map((p: KPolicy) => `[From "${p.title}"]\n${clean(`${p.title}\n\n${p.summary || ''}\n\n${p.body_md || ''}`)}`)
            .join('\n\n');

          const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `You are a helpful assistant that answers questions about company policies.
                Use the provided context to answer questions accurately and concisely.
                Always cite which policy your information comes from.`,
              },
              {
                role: 'user',
                content: `Context from our policies:\n\n${fallbackContext}\n\nQuestion: ${message}`,
              },
            ],
            temperature: 0.7,
            max_tokens: 500,
          });

          const answer = completion.choices[0].message.content || 'No answer generated';
          const primary = kps[0];
          const sources = primary
            ? [{ slug: primary.slug, title: primary.title, url: `/p/${primary.slug}` }]
            : [];

          return NextResponse.json({ answer, sources });
        }
      }

      return NextResponse.json({
        answer: "I couldn't find any relevant information in our policies to answer that question. Could you please rephrase or ask something else?",
        sources: [],
      });
    }

    // Augment vector matches with keyword hits for recall
    const augmentedMatches: PolicyMatch[] = (matches as PolicyMatch[]) || [];
    try {
      const tokens = (message.toLowerCase().match(/[a-z0-9]+/g) || []) as string[];
      const keywords = Array.from(new Set(tokens.filter((w: string) => w.length >= 3))).slice(0, 5);
      const synonyms: string[] = [];
      const lc = message.toLowerCase();
      if (lc.includes('work hour') || (lc.includes('work') && lc.includes('hour'))) {
        synonyms.push(
          'work hours',
          'working hours',
          'business hours',
          'hours of work',
          'office hours',
          'core hours',
          'operating hours',
          'standard hours',
          'working time',
          'work schedule',
          'start time',
          'end time',
          '9-5',
          '9 to 5'
        );
      }
      const terms = Array.from(new Set([...keywords, ...synonyms]));
      if (terms.length > 0) {
        const orFilter = terms
          .map((t) => `title.ilike.%${t}%,summary.ilike.%${t}%,body_md.ilike.%${t}%`)
          .join(',');
        const { data: kwPolicies } = await supaAdmin
          .from('policies')
          .select('slug, title, summary, body_md')
          .or(orFilter)
          .limit(5);
        if (kwPolicies && kwPolicies.length > 0) {
          const clean = (s: string) => (s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
          const kps2 = (kwPolicies as KPolicy[] | null) || [];
          const kwMatches = kps2.map((p: KPolicy) => ({
            policy_slug: p.slug,
            content: clean(`${p.title}\n\n${p.summary || ''}\n\n${p.body_md || ''}`).slice(0, 1200),
          }));
          const seen = new Set(augmentedMatches.map((m: PolicyMatch) => m.policy_slug));
          for (const km of kwMatches) {
            if (!seen.has(km.policy_slug)) {
              augmentedMatches.push(km);
              seen.add(km.policy_slug);
            }
          }
        }
      }
    } catch (e) {
      console.error('KW augment error:', e);
    }

    // Get unique policy titles for sources
    const uniquePolicySlugs = [...new Set(augmentedMatches.map((m: PolicyMatch) => m.policy_slug))];
    const { data: policies } = await supaAdmin
      .from('policies')
      .select('slug, title')
      .in('slug', uniquePolicySlugs);

    const policyList = (policies as PolicyMeta[] | null) || [];
    const policyTitles = new Map(
      policyList.map((p: PolicyMeta) => [p.slug, p.title])
    );

    // Build context from matches (vector + keyword-augmented)
    const context = augmentedMatches
      .map((match: PolicyMatch) => {
        const policyTitle = policyTitles.get(match.policy_slug) || match.policy_slug;
        return `[From "${policyTitle}"]\n${match.content}`;
      })
      .join('\n\n');

    // Generate answer using OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant that answers questions about company policies. 
          Use the provided context to answer questions accurately and concisely.
          If the context doesn't contain enough information to answer the question, say so.
          Always cite which policy your information comes from.
          Keep answers professional and friendly.`,
        },
        {
          role: 'user',
          content: `Context from our policies:\n\n${context}\n\nQuestion: ${message}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const answer = completion.choices[0].message.content || 'No answer generated';

    // Format a single primary source link (top vector match or first augmented)
    const primarySlug =
      (matches as PolicyMatch[])[0]?.policy_slug ||
      augmentedMatches[0]?.policy_slug;
    const sources = primarySlug
      ? [{
          slug: primarySlug,
          title: policyTitles.get(primarySlug) || primarySlug,
          url: `/p/${primarySlug}`,
        }]
      : [];

    return NextResponse.json({
      answer,
      sources,
    });

  } catch (error: unknown) {
    console.error('Chat error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ 
      error: message 
    }, { status: 500 });
  }
}
