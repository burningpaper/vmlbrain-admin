import { createClient } from '@supabase/supabase-js';

// Guard against build-time evaluation without envs (Vercel build)
// Prefer server-side SUPABASE_URL/SUPABASE_ANON_KEY if present, otherwise NEXT_PUBLIC_*.
const PUBLIC_SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'http://localhost:54321';
const PUBLIC_SUPABASE_ANON =
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'anon-key';

type NextRequestInit = RequestInit & {
  next?: { revalidate?: number | false };
};

export const supa = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON, {
  // Force all Supabase network calls to bypass Next/Vercel caches
  global: {
    fetch: (input: RequestInfo | URL, init?: RequestInit) => {
      const serverOnlyNext: Pick<NextRequestInit, 'next'> =
        typeof window === 'undefined' ? { next: { revalidate: 0 } } : {};
      const merged: NextRequestInit = {
        ...(init || {}),
        cache: 'no-store',
        ...serverOnlyNext,
      };
      return fetch(input, merged);
    },
    headers: {
      // Extra guard (some CDNs respect request cache-control)
      'cache-control': 'no-store',
    },
  },
});
