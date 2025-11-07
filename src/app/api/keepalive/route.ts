import { NextResponse } from 'next/server';
import { supaAdmin } from '@/lib/supabaseAdmin';

// Lightweight daily ping endpoint to keep Supabase warm.
// Does a HEAD-style count-only select on a small table (policies) to touch the DB.
// Safe to call from a scheduler or curl; returns { ok: true } on success.
export async function GET() {
  try {
    // Perform a cheap select without fetching rows
    const { error } = await supaAdmin
      .from('policies')
      .select('slug', { head: true, count: 'exact' })
      .limit(1);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
