'use client';

import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    Box?: any;
  }
}

type Props = {
  folderId: string; // Attached Box folder id for this article
  fileIds?: string[] | null; // Optional specific file ids to highlight/link
  className?: string;
};

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

    async function fetchToken() {
      const res = await fetch('/api/box/token', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ folderId }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Token error: ${txt}`);
      }
      return (await res.json()) as { token: string; expiresIn: number };
    }

    async function init() {
      try {
        if (!folderId) {
          setError('No Box folder linked to this article.');
          return;
        }
        await ensureElementsAssets();
        const { token } = await fetchToken();
        if (cancelled) return;

        // Render Box Content Explorer
        if (!window.Box || !window.Box.ContentExplorer) {
          throw new Error('Box Elements not available on window.');
        }
        const explorer = new window.Box.ContentExplorer();
        explorer.show(folderId, token, {
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
      } catch (e: any) {
        console.error('BoxExplorer error:', e);
        setError(e?.message || 'Failed to load Box content');
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [folderId]);

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700">Related Files</h3>
        {folderId && (
          <a
            href={`https://app.box.com/folder/${folderId}`}
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
