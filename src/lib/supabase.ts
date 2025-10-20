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

export const supa = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON);
