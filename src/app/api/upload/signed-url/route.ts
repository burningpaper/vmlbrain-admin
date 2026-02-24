import { NextResponse } from 'next/server';
import { storageClient } from '@/lib/storage';

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

    // Generate unique filename
    const timestamp = Date.now();
    const uniqueFilename = `${timestamp}-${filename}`;

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
      publicUrl,
    });
  } catch (error) {
    console.error('Signed URL error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create signed URL';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
