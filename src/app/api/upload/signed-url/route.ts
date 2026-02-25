import { NextResponse } from 'next/server';
import { storageClient } from '@/lib/storage';

/**
 * Sanitize filename for storage - removes emojis, special characters,
 * and replaces spaces with underscores. Keeps only safe ASCII characters.
 */
function sanitizeFilename(filename: string): string {
  // Extract extension
  const lastDot = filename.lastIndexOf('.');
  const ext = lastDot !== -1 ? filename.slice(lastDot) : '';
  const baseName = lastDot !== -1 ? filename.slice(0, lastDot) : filename;

  // Remove emojis and non-ASCII characters, replace spaces with underscores
  const sanitized = baseName
    .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII (emojis, etc.)
    .replace(/\s+/g, '_')         // Replace spaces with underscores
    .replace(/[^a-zA-Z0-9_-]/g, '') // Keep only alphanumeric, underscore, hyphen
    .replace(/_+/g, '_')          // Collapse multiple underscores
    .replace(/^_|_$/g, '');       // Trim leading/trailing underscores

  // Ensure we have a valid filename
  const finalBase = sanitized || 'file';

  return finalBase + ext.toLowerCase();
}

export async function POST(req: Request) {
  try {
    // Verify edit token
    const key = req.headers.get('x-edit-token');
    if (key !== process.env.EDIT_TOKEN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { filename } = await req.json();

    if (!filename) {
      return NextResponse.json({ error: 'Filename required' }, { status: 400 });
    }

    // Sanitize and generate unique filename
    const timestamp = Date.now();
    const safeFilename = sanitizeFilename(filename);
    const uniqueFilename = `${timestamp}-${safeFilename}`;

    // Create signed upload URL (valid for 1 hour)
    const { data, error } = await storageClient.storage
      .from('policy-assets')
      .createSignedUploadUrl(uniqueFilename);

    if (error) {
      console.error('Signed URL error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get public URL for after upload completes
    const { data: { publicUrl } } = storageClient.storage
      .from('policy-assets')
      .getPublicUrl(uniqueFilename);

    return NextResponse.json({
      signedUrl: data.signedUrl,
      token: data.token,
      path: data.path,
      objectName: uniqueFilename, // Clean filename for TUS uploads
      publicUrl,
    });
  } catch (error) {
    console.error('Signed URL error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create signed URL';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
