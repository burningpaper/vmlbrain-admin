// Drop all tables in Neon to start fresh
import pkg from 'pg';
const { Client } = pkg;

const DATABASE_URL = 'postgresql://neondb_owner:npg_DNhlv8gA5FQZ@ep-calm-star-aifkzecl-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function resetNeon() {
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    console.log('🔌 Connecting to Neon...');
    await client.connect();
    console.log('✅ Connected!\n');

    console.log('🗑️  Dropping all tables and extensions...');

    // Drop tables in correct order (respect foreign keys)
    await client.query(`
      DROP TABLE IF EXISTS profile_embeddings CASCADE;
      DROP TABLE IF EXISTS policy_embeddings CASCADE;
      DROP TABLE IF EXISTS profiles CASCADE;
      DROP TABLE IF EXISTS policies CASCADE;
      DROP TABLE IF EXISTS sections CASCADE;
      DROP VIEW IF EXISTS profile_meta CASCADE;
    `);

    // Drop functions
    await client.query(`
      DROP FUNCTION IF EXISTS match_policy_embeddings CASCADE;
      DROP FUNCTION IF EXISTS match_profile_embeddings CASCADE;
    `);

    // Drop extensions
    await client.query(`
      DROP EXTENSION IF EXISTS vector CASCADE;
      DROP EXTENSION IF EXISTS "uuid-ossp" CASCADE;
    `);

    console.log('✅ All tables and extensions dropped!\n');
    console.log('Ready to import fresh schema and data.');

  } catch (error) {
    console.error('❌ Reset failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

resetNeon();
