'use client';

import { useEffect, useMemo, useState } from 'react';
import BoxExplorer from '@/components/BoxExplorer';

type Props = {
  initialFolderId?: string;
  initialFileIds?: string[];
};

export default function FilesPageClient({ initialFolderId, initialFileIds }: Props) {
  const [folderId, setFolderId] = useState(initialFolderId || '');
  const [filesCsv, setFilesCsv] = useState((initialFileIds || []).join(','));

  const fileIds = useMemo(
    () => filesCsv.split(',').map(s => s.trim()).filter(Boolean),
    [filesCsv]
  );

  useEffect(() => {
    // Keep URL in sync for easy sharing
    const params = new URLSearchParams();
    if (folderId) params.set('folder', folderId);
    if (fileIds.length) params.set('files', fileIds.join(','));
    const url = `${location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    window.history.replaceState(null, '', url);
  }, [folderId, fileIds]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Box Files</h1>
        <p className="text-sm text-gray-600 mt-1">
          Preview your Box folder tree and linked files as it will appear next to articles. 
          Paste a Box folder ID and optional file IDs to test. This UI works even if your Box app is not yet authorized—
          it will show a clear message if the token endpoint cannot mint a token yet.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Box Folder ID</label>
          <input
            className="w-full border p-2 rounded"
            placeholder="e.g. 0 or a concrete folder id"
            value={folderId}
            onChange={(e) => setFolderId(e.target.value)}
          />
          {folderId && (
            <a
              href={`https://app.box.com/folder/${folderId}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-blue-600 hover:underline mt-1 inline-block"
            >
              Open this folder in Box →
            </a>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Linked File IDs (comma-separated)</label>
          <input
            className="w-full border p-2 rounded"
            placeholder="12345, 67890"
            value={filesCsv}
            onChange={(e) => setFilesCsv(e.target.value)}
          />
          <p className="text-xs text-gray-500 mt-1">
            Optional: add specific files to link below the tree.
          </p>
        </div>
      </div>

      <div className="border rounded p-3 bg-gray-50">
        <BoxExplorer folderId={folderId} fileIds={fileIds} />
      </div>

      <div className="mt-6 text-sm text-gray-600 space-y-2">
        <p className="font-medium">How this connects to articles:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>On each Knowledge Article (in Admin), set “Box Folder ID” and optional “Box File IDs”.</li>
          <li>The article page renders a “Related Files” panel in the right sidebar using the same Box explorer.</li>
          <li>If your Box app isn’t authorized yet, the panel will indicate a token error until approval is completed.</li>
        </ul>
      </div>
    </div>
  );
}
