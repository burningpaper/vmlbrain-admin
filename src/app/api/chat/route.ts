import { NextResponse } from 'next/server';
import { supaAdmin } from '@/lib/supabaseAdmin';
import OpenAI from 'openai';


type PolicyMatch = { policy_slug: string; content: string; chunk_index?: number; id?: number; similarity?: number };
type PolicyMeta = { slug: string; title: string };
type KPolicy = { slug: string; title: string; summary: string | null; body_md: string | null };

type ProfileMatch = { profile_slug: string; content: string; chunk_index?: number; id?: number; similarity?: number };
type ProfileMeta = { slug: string; first_name: string; last_name: string; job_title: string };

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

    // Search for similar chunks in both policies and profiles
    const { data: pMatches, error: pSearchError } = await supaAdmin
      .rpc('match_profile_embeddings', {
        query_embedding: questionEmbedding,
        match_threshold: 0.35,
        match_count: 10,
      });

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

    if ((!matches || matches.length === 0) && (!pMatches || pMatches.length === 0)) {
      // Fallback: keyword search over both policies and profiles if vector search returns nothing
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

        // Policies keyword search
        let policyContext = '';
        let primaryPolicy: { slug: string; title: string } | null = null;
        if (terms.length > 0) {
          const pOr = terms.map(t => `title.ilike.%${t}%,summary.ilike.%${t}%,body_md.ilike.%${t}%`).join(',');
          const { data: kwPolicies } = await supaAdmin
            .from('policies')
            .select('slug, title, summary, body_md')
            .or(pOr)
            .limit(3);
          if (kwPolicies && kwPolicies.length > 0) {
            const kps = (kwPolicies as KPolicy[] | null) || [];
            policyContext = kps
              .map((p: KPolicy) => `[From "${p.title}"]\n${clean(`${p.title}\n\n${p.summary || ''}\n\n${p.body_md || ''}`)}`)
              .join('\n\n');
            primaryPolicy = { slug: kps[0].slug, title: kps[0].title };
          }
        }

        // Profiles keyword search
        let profileContext = '';
        let primaryProfile: { slug: string; title: string } | null = null;
        if (terms.length > 0) {
          const profOr = terms
            .map(t => `first_name.ilike.%${t}%,last_name.ilike.%${t}%,job_title.ilike.%${t}%,description_html.ilike.%${t}%`)
            .join(',');
          const { data: kwProfiles } = await supaAdmin
            .from('profiles')
            .select('slug, first_name, last_name, job_title, description_html')
            .or(profOr)
            .limit(3);
          if (kwProfiles && kwProfiles.length > 0) {
            const profs = kwProfiles as { slug: string; first_name: string; last_name: string; job_title: string; description_html: string | null }[];
            profileContext = profs
              .map((p) => {
                const name = `${p.first_name} ${p.last_name}`.trim();
                return `[From "${name} — ${p.job_title}"]\n${clean(p.description_html || '')}`;
              })
              .join('\n\n');
            const t0 = profs[0];
            primaryProfile = { slug: t0.slug, title: `${t0.first_name} ${t0.last_name}`.trim() };
          }
        }

        const combinedContext = [policyContext, profileContext].filter(Boolean).join('\n\n');

        if (combinedContext) {
          const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `You are a helpful assistant that answers questions about company policies and people profiles.
                Use the provided context to answer questions accurately and concisely.
                Always cite which page your information comes from.`,
              },
              {
                role: 'user',
                content: `Context:\n\n${combinedContext}\n\nQuestion: ${message}`,
              },
            ],
            temperature: 0.7,
            max_tokens: 500,
          });

          const answer = completion.choices[0].message.content || 'No answer generated';
          const sources = primaryPolicy
            ? [{ slug: primaryPolicy.slug, title: primaryPolicy.title, url: `/p/${primaryPolicy.slug}` }]
            : primaryProfile
            ? [{ slug: primaryProfile.slug, title: primaryProfile.title, url: `/people/${primaryProfile.slug}` }]
            : [];

          return NextResponse.json({ answer, sources });
        }
      }

      return NextResponse.json({
        answer: "I couldn't find anything relevant in policies or profiles to answer that question. Could you please rephrase or ask something else?",
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

    // Collect profile vector matches
    const profileVectorMatches: ProfileMatch[] = ((pMatches as ProfileMatch[]) || []).map((m) => m);

    // Get unique policy titles
    const uniquePolicySlugs = [...new Set(augmentedMatches.map((m: PolicyMatch) => m.policy_slug))];
    const { data: policies } = await supaAdmin
      .from('policies')
      .select('slug, title')
      .in('slug', uniquePolicySlugs);

    const policyList = (policies as PolicyMeta[] | null) || [];
    const policyTitles = new Map(policyList.map((p: PolicyMeta) => [p.slug, p.title]));

    // Get unique profile meta for titles
    const uniqueProfileSlugs = [...new Set(profileVectorMatches.map((m: ProfileMatch) => m.profile_slug))];
    const { data: profMeta } = uniqueProfileSlugs.length
      ? await supaAdmin
          .from('profiles')
          .select('slug, first_name, last_name, job_title')
          .in('slug', uniqueProfileSlugs)
      : { data: [] as any };

    const profileList = (profMeta as ProfileMeta[] | null) || [];
    const profileTitles = new Map(
      profileList.map((p: ProfileMeta) => [p.slug, `${p.first_name} ${p.last_name}`.trim() + (p.job_title ? ` — ${p.job_title}` : '')])
    );

    // Build combined context (policies + profiles)
    const policyContext = augmentedMatches
      .map((match: PolicyMatch) => {
        const policyTitle = policyTitles.get(match.policy_slug) || match.policy_slug;
        return `[From "${policyTitle}"]\n${match.content}`;
      })
      .join('\n\n');

    const profileContext = profileVectorMatches
      .map((match: ProfileMatch) => {
        const title = profileTitles.get(match.profile_slug) || match.profile_slug;
        return `[From "${title}"]\n${match.content}`;
      })
      .join('\n\n');

    const combinedContext = [policyContext, profileContext].filter(Boolean).join('\n\n');

    // Generate answer using OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant that answers questions about company policies and people profiles.
          Use the provided context to answer questions accurately and concisely.
          If the context doesn't contain enough information to answer the question, say so.
          Always cite which page your information comes from.
          Keep answers professional and friendly.`,
        },
        {
          role: 'user',
          content: `Context:\n\n${combinedContext}\n\nQuestion: ${message}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const answer = completion.choices[0].message.content || 'No answer generated';

    // Choose a primary source from the highest-similarity match among policies and profiles
    const topPolicy = (matches as PolicyMatch[] | null)?.[0];
    const topProfile = (pMatches as ProfileMatch[] | null)?.[0];

    let sources: Array<{ slug: string; title: string; url: string }> = [];
    if (topPolicy && (!topProfile || (topPolicy.similarity || 0) >= (topProfile.similarity || 0))) {
      const slug = topPolicy.policy_slug;
      sources = [{ slug, title: policyTitles.get(slug) || slug, url: `/p/${slug}` }];
    } else if (topProfile) {
      const slug = topProfile.profile_slug;
      const title = profileTitles.get(slug) || slug;
      sources = [{ slug, title, url: `/people/${slug}` }];
    }

    return NextResponse.json({ answer, sources });

  } catch (error: unknown) {
    console.error('Chat error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ 
      error: message 
    }, { status: 500 });
  }
}
