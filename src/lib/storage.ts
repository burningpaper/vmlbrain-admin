// Supabase Storage client (for file uploads)
// We keep using Supabase Storage even after migrating DB to Neon
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE!;

export const storageClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Helper to upload a file to Supabase Storage
export async function uploadFile(bucket: string, path: string, file: File | Buffer) {
  const { data, error } = await storageClient.storage
    .from(bucket)
    .upload(path, file, {
      upsert: true,
      contentType: file instanceof File ? file.type : undefined,
    });

  if (error) throw error;

  // Get public URL
  const { data: { publicUrl } } = storageClient.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return publicUrl;
}
