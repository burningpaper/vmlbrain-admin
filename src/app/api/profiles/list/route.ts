import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const result = await db.query(`
      SELECT slug, first_name, last_name, job_title
      FROM profiles
      ORDER BY last_name ASC
    `);

    return NextResponse.json(result.rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
