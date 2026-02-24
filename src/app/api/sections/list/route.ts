import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const result = await db.query(`
      SELECT key, name, icon, sort_order
      FROM sections
      ORDER BY sort_order
    `);

    return NextResponse.json(result.rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
