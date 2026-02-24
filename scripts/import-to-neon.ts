// Import schema and data to Neon database
import { readFileSync } from 'fs';
import pkg from 'pg';
const { Client } = pkg;

const DATABASE_URL = 'postgresql://neondb_owner:npg_DNhlv8gA5FQZ@ep-calm-star-aifkzecl-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function importToNeon() {
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    console.log('🔌 Connecting to Neon...\n');
    await client.connect();
    console.log('✅ Connected!\n');

    // Import schema
    console.log('📦 Importing schema...');
    const schema = readFileSync('migration/complete-schema.sql', 'utf8');
    await client.query(schema);
    console.log('✅ Schema imported!\n');

    // Import data (drop FK temporarily to avoid insertion order issues)
    console.log('📦 Importing data...');
    await client.query('ALTER TABLE policies DROP CONSTRAINT IF EXISTS policies_parent_slug_fkey;');
    const data = readFileSync('migration/data-export.sql', 'utf8');
    await client.query(data);
    await client.query('ALTER TABLE policies ADD CONSTRAINT policies_parent_slug_fkey FOREIGN KEY (parent_slug) REFERENCES policies(slug) ON DELETE SET NULL;');
    console.log('✅ Data imported!\n');

    // Verify data
    console.log('🔍 Verifying data...\n');

    const counts = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM sections) as sections_count,
        (SELECT COUNT(*) FROM policies) as policies_count,
        (SELECT COUNT(*) FROM profiles) as profiles_count,
        (SELECT COUNT(*) FROM policy_embeddings) as policy_embeddings_count,
        (SELECT COUNT(*) FROM profile_embeddings) as profile_embeddings_count
    `);

    console.log('📊 Row counts:');
    console.log(`  - Sections: ${counts.rows[0].sections_count}`);
    console.log(`  - Policies: ${counts.rows[0].policies_count}`);
    console.log(`  - Profiles: ${counts.rows[0].profiles_count}`);
    console.log(`  - Policy Embeddings: ${counts.rows[0].policy_embeddings_count}`);
    console.log(`  - Profile Embeddings: ${counts.rows[0].profile_embeddings_count}`);
    console.log('');

    // Verify pgvector extension
    const vectorCheck = await client.query(`
      SELECT * FROM pg_extension WHERE extname = 'vector'
    `);
    console.log(`✅ pgvector extension: ${vectorCheck.rows.length > 0 ? 'Enabled' : 'NOT ENABLED - ERROR!'}`);

    // Verify embeddings dimension
    if (counts.rows[0].policy_embeddings_count > 0) {
      const dimCheck = await client.query(`
        SELECT policy_slug, vector_dims(embedding) as dims
        FROM policy_embeddings
        LIMIT 3
      `);
      console.log(`✅ Sample embedding dimensions:`);
      dimCheck.rows.forEach(row => {
        console.log(`  - ${row.policy_slug}: ${row.dims} dimensions`);
      });
    }

    console.log('\n🎉 Import complete and verified!');

  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

importToNeon();
