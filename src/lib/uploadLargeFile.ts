/**
 * Upload large files directly to Supabase Storage using signed URLs.
 * This bypasses Vercel's 4.5MB serverless function limit.
 *
 * For files under 4MB, you can still use the regular /api/upload endpoint.
 * For larger files (videos, etc.), use this function.
 */

interface UploadResult {
  url: string;
  error?: string;
}

export async function uploadLargeFile(
  file: File,
  token: string,
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  try {
    // Step 1: Get signed upload URL from our API
    const signedUrlRes = await fetch('/api/upload/signed-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-edit-token': token,
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
    // Signed URLs use PUT with raw file body
    // Using XMLHttpRequest for progress tracking
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
          // Try to get detailed error from response
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

      // Signed URL upload: PUT with raw file body and required headers
      // Based on Supabase storage-js SDK implementation
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
 * Smart upload function that chooses the best method based on file size.
 * - Files under 4MB: Use regular API route (simpler)
 * - Files over 4MB: Use signed URL direct upload
 */
export async function uploadFile(
  file: File,
  token: string,
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  const FOUR_MB = 4 * 1024 * 1024;

  if (file.size > FOUR_MB) {
    // Large file: use signed URL upload
    return uploadLargeFile(file, token, onProgress);
  }

  // Small file: use regular API route
  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'x-edit-token': token },
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
