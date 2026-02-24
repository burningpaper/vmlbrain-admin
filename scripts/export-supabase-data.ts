// Export all data from Supabase to SQL format
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function exportData() {
  console.log('🚀 Starting Supabase data export...\n');

  let sql = `-- Exported data from Supabase
-- Generated on ${new Date().toISOString()}

`;

  try {
    // Export sections
    console.log('📦 Exporting sections...');
    const { data: sections, error: sectionsError } = await supabase
      .from('sections')
      .select('*')
      .order('sort_order');

    if (sectionsError) throw sectionsError;

    if (sections && sections.length > 0) {
      sql += `-- Sections data\n`;
      for (const row of sections) {
        const key = sqlEscape(row.key);
        const name = sqlEscape(row.name);
        const icon = row.icon ? sqlEscape(row.icon) : 'NULL';
        const imageName = row.image_name ? sqlEscape(row.image_name) : 'NULL';
        const sortOrder = row.sort_order || 0;
        sql += `INSERT INTO sections (key, name, icon, image_name, sort_order) VALUES (${key}, ${name}, ${icon}, ${imageName}, ${sortOrder}) ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon, image_name = EXCLUDED.image_name, sort_order = EXCLUDED.sort_order;\n`;
      }
      sql += `\n`;
      console.log(`✅ Exported ${sections.length} sections\n`);
    } else {
      console.log(`⚠️  No sections found\n`);
    }

    // Export policies
    console.log('📦 Exporting policies...');
    const { data: policies, error: policiesError } = await supabase
      .from('policies')
      .select('*')
      .order('id');

    if (policiesError) throw policiesError;

    if (policies && policies.length > 0) {
      sql += `-- Policies data\n`;
      for (const row of policies) {
        const id = sqlEscape(row.id); // UUID needs quoting
        const slug = sqlEscape(row.slug);
        const title = sqlEscape(row.title);
        const summary = row.summary ? sqlEscape(row.summary) : 'NULL';
        const bodyMd = row.body_md ? sqlEscape(row.body_md) : 'NULL';
        const parentSlug = row.parent_slug ? sqlEscape(row.parent_slug) : 'NULL';
        const sectionKey = row.section_key ? sqlEscape(row.section_key) : 'NULL';
        const boxFolderId = row.box_folder_id ? sqlEscape(row.box_folder_id) : 'NULL';
        const boxFileIds = row.box_file_ids ? sqlArray(row.box_file_ids) : 'NULL';
        const audience = row.audience ? sqlArray(row.audience) : "ARRAY['All']";
        const status = sqlEscape(row.status || 'approved');
        const createdAt = row.created_at ? sqlEscape(row.created_at) : 'NOW()';
        const updatedAt = row.updated_at ? sqlEscape(row.updated_at) : 'NOW()';

        sql += `INSERT INTO policies (id, slug, title, summary, body_md, parent_slug, section_key, box_folder_id, box_file_ids, audience, status, created_at, updated_at) VALUES (${id}, ${slug}, ${title}, ${summary}, ${bodyMd}, ${parentSlug}, ${sectionKey}, ${boxFolderId}, ${boxFileIds}, ${audience}, ${status}, ${createdAt}, ${updatedAt}) ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, summary = EXCLUDED.summary, body_md = EXCLUDED.body_md, parent_slug = EXCLUDED.parent_slug, section_key = EXCLUDED.section_key, box_folder_id = EXCLUDED.box_folder_id, box_file_ids = EXCLUDED.box_file_ids, audience = EXCLUDED.audience, status = EXCLUDED.status, updated_at = EXCLUDED.updated_at;\n`;
      }
      sql += `\n`;
      console.log(`✅ Exported ${policies.length} policies\n`);
    } else {
      console.log(`⚠️  No policies found\n`);
    }

    // Export profiles
    console.log('📦 Exporting profiles...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('id');

    if (profilesError) throw profilesError;

    if (profiles && profiles.length > 0) {
      sql += `-- Profiles data\n`;
      for (const row of profiles) {
        const id = row.id;
        const slug = sqlEscape(row.slug);
        const firstName = sqlEscape(row.first_name);
        const lastName = sqlEscape(row.last_name);
        const jobTitle = sqlEscape(row.job_title);
        const descriptionHtml = sqlEscape(row.description_html);
        const clients = row.clients ? sqlArray(row.clients) : "'{}'::text[]";
        const experience = row.experience ? sqlEscape(row.experience) : 'NULL';
        const photoUrl = row.photo_url ? sqlEscape(row.photo_url) : 'NULL';
        const email = sqlEscape(row.email);
        const status = sqlEscape(row.status || 'approved');
        const createdAt = row.created_at ? sqlEscape(row.created_at) : 'NOW()';
        const updatedAt = row.updated_at ? sqlEscape(row.updated_at) : 'NOW()';

        sql += `INSERT INTO profiles (id, slug, first_name, last_name, job_title, description_html, clients, experience, photo_url, email, status, created_at, updated_at) VALUES (${id}, ${slug}, ${firstName}, ${lastName}, ${jobTitle}, ${descriptionHtml}, ${clients}, ${experience}, ${photoUrl}, ${email}, ${status}, ${createdAt}, ${updatedAt}) ON CONFLICT (slug) DO UPDATE SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, job_title = EXCLUDED.job_title, description_html = EXCLUDED.description_html, clients = EXCLUDED.clients, experience = EXCLUDED.experience, photo_url = EXCLUDED.photo_url, email = EXCLUDED.email, status = EXCLUDED.status, updated_at = EXCLUDED.updated_at;\n`;
      }
      sql += `\n`;
      console.log(`✅ Exported ${profiles.length} profiles\n`);
    } else {
      console.log(`⚠️  No profiles found\n`);
    }

    // Export policy embeddings
    console.log('📦 Exporting policy_embeddings...');
    const { data: policyEmbeddings, error: embeddingsError } = await supabase
      .from('policy_embeddings')
      .select('*')
      .order('id');

    if (embeddingsError) throw embeddingsError;

    if (policyEmbeddings && policyEmbeddings.length > 0) {
      sql += `-- Policy embeddings data\n`;
      for (const row of policyEmbeddings) {
        const id = row.id;
        const policyId = sqlEscape(row.policy_id); // UUID needs quoting
        const policySlug = sqlEscape(row.policy_slug);
        const chunkIndex = row.chunk_index;
        const content = sqlEscape(row.content);
        const embedding = sqlVector(row.embedding);
        const createdAt = row.created_at ? sqlEscape(row.created_at) : 'NOW()';

        sql += `INSERT INTO policy_embeddings (id, policy_id, policy_slug, chunk_index, content, embedding, created_at) VALUES (${id}, ${policyId}, ${policySlug}, ${chunkIndex}, ${content}, ${embedding}, ${createdAt}) ON CONFLICT (policy_slug, chunk_index) DO UPDATE SET content = EXCLUDED.content, embedding = EXCLUDED.embedding;\n`;
      }
      sql += `\n`;
      console.log(`✅ Exported ${policyEmbeddings.length} policy embeddings\n`);
    } else {
      console.log(`⚠️  No policy embeddings found\n`);
    }

    // Export profile embeddings
    console.log('📦 Exporting profile_embeddings...');
    const { data: profileEmbeddings, error: profileEmbError } = await supabase
      .from('profile_embeddings')
      .select('*')
      .order('id');

    if (profileEmbError) throw profileEmbError;

    if (profileEmbeddings && profileEmbeddings.length > 0) {
      sql += `-- Profile embeddings data\n`;
      for (const row of profileEmbeddings) {
        const id = row.id;
        const profileId = row.profile_id;
        const profileSlug = sqlEscape(row.profile_slug);
        const chunkIndex = row.chunk_index;
        const content = sqlEscape(row.content);
        const embedding = sqlVector(row.embedding);

        sql += `INSERT INTO profile_embeddings (id, profile_id, profile_slug, chunk_index, content, embedding) VALUES (${id}, ${profileId}, ${profileSlug}, ${chunkIndex}, ${content}, ${embedding});\n`;
      }
      sql += `\n`;
      console.log(`✅ Exported ${profileEmbeddings.length} profile embeddings\n`);
    } else {
      console.log(`⚠️  No profile embeddings found\n`);
    }

    // Reset sequences (policies uses UUID so no sequence needed)
    sql += `-- Reset sequences to max values\n`;
    sql += `SELECT setval('profiles_id_seq', COALESCE((SELECT MAX(id) FROM profiles), 1));\n`;
    sql += `SELECT setval('policy_embeddings_id_seq', COALESCE((SELECT MAX(id) FROM policy_embeddings), 1));\n`;
    sql += `SELECT setval('profile_embeddings_id_seq', COALESCE((SELECT MAX(id) FROM profile_embeddings), 1));\n`;

    // Write to file
    writeFileSync('migration/data-export.sql', sql);
    console.log('\n✅ Data export complete! Saved to migration/data-export.sql\n');

  } catch (error) {
    console.error('❌ Export failed:', error);
    process.exit(1);
  }
}

// Helper functions
function sqlEscape(value: any): string {
  if (value === null || value === undefined) return 'NULL';
  return "'" + String(value).replace(/'/g, "''").replace(/\\/g, '\\\\') + "'";
}

function sqlArray(arr: any[]): string {
  if (!arr || arr.length === 0) return "'{}'";
  const escaped = arr.map(item => String(item).replace(/'/g, "''").replace(/\\/g, '\\\\'));
  return "ARRAY['" + escaped.join("','") + "']";
}

function sqlVector(arr: any): string {
  if (!arr) return 'NULL';
  // Handle if it's already a string representation
  if (typeof arr === 'string') {
    if (arr.startsWith('[') && arr.endsWith(']')) {
      return "'" + arr + "'::vector(1536)";
    }
    return "'" + arr + "'::vector(1536)";
  }
  // Handle array
  if (Array.isArray(arr)) {
    if (arr.length === 0) return 'NULL';
    return "'[" + arr.join(',') + "]'::vector(1536)";
  }
  return 'NULL';
}

exportData();
