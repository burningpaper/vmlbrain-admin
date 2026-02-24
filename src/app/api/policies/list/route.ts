import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const result = await db.query(`
      SELECT slug, title, parent_slug
      FROM policies
      ORDER BY title ASC
    `);

    return NextResponse.json(result.rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
