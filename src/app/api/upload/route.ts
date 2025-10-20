import { NextResponse } from 'next/server';
import { supaAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: Request) {
  try {
    const key = req.headers.get('x-edit-token');
    if (key !== process.env.EDIT_TOKEN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${timestamp}-${file.name}`;
    
    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Supabase Storage
    const { error } = await supaAdmin.storage
      .from('policy-assets')
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (error) {
      console.error('Upload error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supaAdmin.storage
      .from('policy-assets')
      .getPublicUrl(filename);

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
