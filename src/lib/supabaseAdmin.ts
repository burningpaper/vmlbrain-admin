import { createClient } from '@supabase/supabase-js';

// Guard against build-time evaluation without envs (Vercel build, static analysis)
// Prefer server-side SUPABASE_URL/SUPABASE_SERVICE_ROLE if present, otherwise NEXT_PUBLIC_* for compatibility.
const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'http://localhost:54321';
const SUPABASE_ANON =
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'anon-key';
const SUPABASE_SERVICE =
  process.env.SUPABASE_SERVICE_ROLE || 'service-role';

export const supa = createClient(SUPABASE_URL, SUPABASE_ANON);

export const supaAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
