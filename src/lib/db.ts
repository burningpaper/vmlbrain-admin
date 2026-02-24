// Neon database client
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Export the pool for direct use
export const db = pool;

// Helper to execute a single query
export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows;
}

// Helper to execute a single query and return first row
export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const result = await pool.query(text, params);
  return result.rows[0] || null;
}

// Helper to execute a query with a count
export async function queryCount(text: string, params?: any[]): Promise<number> {
  const result = await pool.query(text, params);
  return parseInt(result.rows[0]?.count || '0', 10);
}
