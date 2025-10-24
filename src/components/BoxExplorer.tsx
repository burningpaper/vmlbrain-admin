'use client';

import { useEffect, useRef, useState } from 'react';

type BoxContentExplorer = {
  show: (folderId: string, token: string, options: Record<string, unknown>) => void;
};

declare global {
  interface Window {
    Box?: {
      ContentExplorer: new () => BoxContentExplorer;
    };
  }
}

type Props = {
  folderId: string; // Attached Box folder id for this article
  fileIds?: string[] | null; // Optional specific file ids to highlight/link
  className?: string;
};

// Normalize a Box id from either a plain numeric string or a full Box URL.
// Returns only the trailing numeric id, or null if it can't be parsed.
function normalizeBoxId(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.toString().trim();
  // If a full URL was pasted (e.g., https://app.box.com/folder/12345 or /file/6789)
  const match = trimmed.match(/(\d+)(?:\/?$)/);
  if (match) return match[1];
  return /^\d+$/.test(trimmed) ? trimmed : null;
}

/**
 * Renders a read/preview-only Box Content Explorer rooted to the provided folderId.
 * Uses a short-lived downscoped token from /api/box/token.
 *
 * Prereqs:
 * - Set Box JWT env vars (BOX_CLIENT_ID, BOX_CLIENT_SECRET, BOX_ENTERPRISE_ID, BOX_JWT_PRIVATE_KEY, BOX_JWT_PASSPHRASE)
 * - The Box app must be configured and authorized to the enterprise
 */
export default function BoxExplorer({ folderId, fileIds, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function ensureElementsAssets() {
      // Load CSS
      const cssId = 'box-elements-css';
      if (!document.getElementById(cssId)) {
        const link = document.createElement('link');
        link.id = cssId;
        link.rel = 'stylesheet';
        link.href =
          'https://cdn01.boxcdn.net/platform/elements/20.0.0/en-US/explorer.css';
        document.head.appendChild(link);
      }
      // Load JS
      const jsId = 'box-elements-js';
      if (!document.getElementById(jsId)) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.id = jsId;
          script.src =
            'https://cdn01.boxcdn.net/platform/elements/20.0.0/en-US/explorer.js';
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Box Elements'));
          document.body.appendChild(script);
        });
      }
    }

    async function fetchToken(body: { folderId?: string; fileId?: string }) {
      const res = await fetch('/api/box/token', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Token error: ${txt}`);
      }
      return (await res.json()) as { token: string; expiresIn: number };
    }

    async function init() {
      try {
        const normFolderId = normalizeBoxId(folderId);
        const normFileIds = (fileIds || []).map((fid) => normalizeBoxId(fid)).filter(Boolean) as string[];
        const body: { folderId?: string; fileId?: string } | null =
          normFolderId ? { folderId: normFolderId } : normFileIds[0] ? { fileId: normFileIds[0] } : null;

        if (!body) {
          setError('No valid Box folderId or fileId configured.');
          return;
        }

        await ensureElementsAssets();
        const { token } = await fetchToken(body as { folderId?: string; fileId?: string });
        if (cancelled) return;

        // Render Box Content Explorer
        if (!window.Box || !window.Box.ContentExplorer) {
          throw new Error('Box Elements not available on window.');
        }
        const explorer = new window.Box.ContentExplorer();
        explorer.show(normFolderId || '0', token, {
          container: containerRef.current,
          canUpload: false,
          canSetShareAccess: false,
          canRename: false,
          canDelete: false,
          canCreateNewFolder: false,
          // Show only read/preview capabilities
          features: {
            sortableColumns: true,
          },
        });
      } catch (e: unknown) {
        console.error('BoxExplorer error:', e);
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg || 'Failed to load Box content');
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [folderId, fileIds]);

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700">Related Files</h3>
        {normalizeBoxId(folderId) && (
          <a
            href={`https://app.box.com/folder/${normalizeBoxId(folderId)}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-blue-600 hover:underline"
            title="Open this folder in Box"
          >
            Open in Box →
          </a>
        )}
      </div>
      {error ? (
        <div className="text-xs text-red-600">{error}</div>
      ) : (
        <div ref={containerRef} className="h-[420px] border rounded bg-white" />
      )}

      {fileIds && fileIds.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-gray-600 mb-1">
            Linked files:
          </p>
          <ul className="space-y-1">
            {fileIds.map((fid) => (
              <li key={fid}>
                {/* Box preview URL (requires the user to have access) */}
                <a
                  className="text-xs text-blue-600 hover:underline"
                  href={`https://app.box.com/file/${fid}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open file {fid}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
