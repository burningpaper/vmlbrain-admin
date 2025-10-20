/**
 * Generate embeddings for all existing policies
 * 
 * Usage:
 *   npx tsx scripts/generate-all-embeddings.ts
 * 
 * Make sure you have these environment variables set in .env.local:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   - EDIT_TOKEN
 *   - OPENAI_API_KEY
 */

import { createClient } from '@supabase/supabase-js';

// Load environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const EDIT_TOKEN = process.env.EDIT_TOKEN!;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

if (!SUPABASE_URL || !SUPABASE_KEY || !EDIT_TOKEN) {
  console.error('❌ Missing required environment variables!');
  console.error('Make sure you have set:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - NEXT_PUBLIC_SUPABASE_ANON_KEY');
  console.error('  - EDIT_TOKEN');
  console.error('  - OPENAI_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function generateEmbeddings() {
  console.log('🚀 Starting embedding generation for all policies...\n');

  // Get all approved policies
  const { data: policies, error } = await supabase
    .from('policies')
    .select('slug, title')
    .eq('status', 'approved')
    .order('title');

  if (error) {
    console.error('❌ Error fetching policies:', error);
    process.exit(1);
  }

  if (!policies || policies.length === 0) {
    console.log('⚠️  No policies found to process');
    return;
  }

  console.log(`📚 Found ${policies.length} policies to process\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < policies.length; i++) {
    const policy = policies[i];
    const progress = `[${i + 1}/${policies.length}]`;

    try {
      console.log(`${progress} Processing: ${policy.title} (${policy.slug})`);

      const response = await fetch(`${SITE_URL}/api/embeddings/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-edit-token': EDIT_TOKEN,
        },
        body: JSON.stringify({ slug: policy.slug }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`API error: ${error}`);
      }

      const result = await response.json();
      console.log(`  ✅ Created ${result.chunksCreated} embedding chunks\n`);
      successCount++;

    } catch (error: any) {
      console.error(`  ❌ Failed: ${error.message}\n`);
      failCount++;
    }

    // Add a small delay to avoid rate limiting
    if (i < policies.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Summary:');
  console.log(`  ✅ Successful: ${successCount}`);
  console.log(`  ❌ Failed: ${failCount}`);
  console.log(`  📝 Total: ${policies.length}`);
  console.log('='.repeat(50));

  if (failCount > 0) {
    console.log('\n⚠️  Some policies failed. Check the errors above and retry if needed.');
  } else {
    console.log('\n🎉 All embeddings generated successfully!');
  }
}

// Run the script
generateEmbeddings().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});
