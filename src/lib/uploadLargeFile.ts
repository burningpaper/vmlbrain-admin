/**
 * Smart file upload with support for large files.
 *
 * Upload strategy based on file size:
 * - Under 4MB: Use regular /api/upload (through Vercel serverless)
 * - 4MB to 45MB: Use signed URL direct upload
 * - Over 45MB: Use TUS resumable upload (supports files up to 5GB)
 */

import * as tus from 'tus-js-client';

interface UploadResult {
  url: string;
  error?: string;
}

const FOUR_MB = 4 * 1024 * 1024;
const FORTY_FIVE_MB = 45 * 1024 * 1024;

/**
 * Upload files 4MB-45MB using signed URL direct upload.
 */
async function uploadWithSignedUrl(
  file: File,
  editToken: string,
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  try {
    // Step 1: Get signed upload URL from our API
    const signedUrlRes = await fetch('/api/upload/signed-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-edit-token': editToken,
      },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
      }),
    });

    if (!signedUrlRes.ok) {
      const text = await signedUrlRes.text();
      return { url: '', error: `Failed to get upload URL: ${text}` };
    }

    const { signedUrl, publicUrl } = await signedUrlRes.json();

    // Step 2: Upload file directly to Supabase Storage
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ url: publicUrl });
        } else {
          let errorMsg = `Upload failed with status ${xhr.status}`;
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.error || response.message) {
              errorMsg += `: ${response.error || response.message}`;
            }
          } catch {
            if (xhr.responseText) {
              errorMsg += `: ${xhr.responseText.substring(0, 200)}`;
            }
          }
          resolve({ url: '', error: errorMsg });
        }
      });

      xhr.addEventListener('error', () => {
        resolve({ url: '', error: 'Upload failed - network error' });
      });

      xhr.open('PUT', signedUrl);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      xhr.setRequestHeader('x-upsert', 'false');
      xhr.send(file);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    return { url: '', error: message };
  }
}

/**
 * Upload files over 45MB using TUS resumable upload protocol.
 * Supports files up to 5GB with automatic resume on failure.
 */
async function uploadWithTus(
  file: File,
  editToken: string,
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  try {
    // Step 1: Get upload info from our API (token and path)
    const signedUrlRes = await fetch('/api/upload/signed-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-edit-token': editToken,
      },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
      }),
    });

    if (!signedUrlRes.ok) {
      const text = await signedUrlRes.text();
      return { url: '', error: `Failed to get upload URL: ${text}` };
    }

    const { token, objectName, publicUrl } = await signedUrlRes.json();

    // Extract project ID from Supabase URL for TUS endpoint
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const projectId = supabaseUrl.match(/https:\/\/([^.]+)/)?.[1] || '';

    if (!projectId) {
      return { url: '', error: 'Could not determine Supabase project ID' };
    }

    // Step 2: Use TUS protocol for resumable upload
    return new Promise((resolve) => {
      const upload = new tus.Upload(file, {
        endpoint: `https://${projectId}.supabase.co/storage/v1/upload/resumable`,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        headers: {
          'x-upsert': 'false',
        },
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true,
        metadata: {
          bucketName: 'policy-assets',
          objectName: objectName,
          contentType: file.type || 'application/octet-stream',
          cacheControl: '3600',
        },
        // Use signed token for authentication
        onBeforeRequest: (req) => {
          req.setHeader('x-signature', token);
        },
        chunkSize: 6 * 1024 * 1024, // 6MB chunks (required by Supabase)
        onError: (error) => {
          console.error('TUS upload error:', error);
          resolve({ url: '', error: `Upload failed: ${error.message}` });
        },
        onProgress: (bytesUploaded, bytesTotal) => {
          if (onProgress) {
            const percent = Math.round((bytesUploaded / bytesTotal) * 100);
            onProgress(percent);
          }
        },
        onSuccess: () => {
          resolve({ url: publicUrl });
        },
      });

      // Check for previous uploads and resume if found
      upload.findPreviousUploads().then((previousUploads) => {
        if (previousUploads.length) {
          upload.resumeFromPreviousUpload(previousUploads[0]);
        }
        upload.start();
      });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    return { url: '', error: message };
  }
}

/**
 * Upload small files (under 4MB) through our API route.
 */
async function uploadSmallFile(
  file: File,
  editToken: string
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'x-edit-token': editToken },
      body: formData,
    });

    if (!res.ok) {
      const text = await res.text();
      return { url: '', error: text };
    }

    const { url } = await res.json();
    return { url };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    return { url: '', error: message };
  }
}

/**
 * Smart upload function that chooses the best method based on file size.
 * - Files under 4MB: Use regular API route (simpler)
 * - Files 4MB-45MB: Use signed URL direct upload
 * - Files over 45MB: Use TUS resumable upload (supports up to 5GB)
 */
export async function uploadFile(
  file: File,
  token: string,
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  if (file.size <= FOUR_MB) {
    // Small file: use regular API route
    return uploadSmallFile(file, token);
  } else if (file.size <= FORTY_FIVE_MB) {
    // Medium file: use signed URL direct upload
    return uploadWithSignedUrl(file, token, onProgress);
  } else {
    // Large file: use TUS resumable upload
    return uploadWithTus(file, token, onProgress);
  }
}

/**
 * Legacy export for backward compatibility.
 */
export async function uploadLargeFile(
  file: File,
  token: string,
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  return uploadFile(file, token, onProgress);
}
