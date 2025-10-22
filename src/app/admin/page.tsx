'use client';

import { useEffect, useState } from 'react';
import { supa } from '@/lib/supabase';
import PolicyEditor from '@/components/PolicyEditor';

interface Policy {
  slug: string;
  title: string;
  parent_slug: string | null;
}

export default function AdminPage() {
  const [list, setList] = useState<Policy[]>([]);
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [bodyHtml, setBodyHtml] = useState('<p></p>');
  const [parentSlug, setParentSlug] = useState('');
  const [token, setToken] = useState('');
  // Box linking
  const [boxFolderId, setBoxFolderId] = useState('');
  const [boxFileIdsText, setBoxFileIdsText] = useState('');

  // Fetch all policies for the sidebar
  useEffect(() => {
    (async () => {
      const { data, error } = await supa
        .from('policies')
        .select('slug,title,parent_slug')
        .order('title', { ascending: true });

      if (!error && data) setList(data);
    })();
  }, []);

  // Build tree structure
  interface PolicyTree extends Policy { children: PolicyTree[] }
  const buildTree = (policies: Policy[]): PolicyTree[] => {
    const tree: PolicyTree[] = [];
    const map = new Map<string, PolicyTree>();

    // Create a map of all policies
    policies.forEach(p => {
      map.set(p.slug, { ...p, children: [] });
    });

  // Build the tree
  policies.forEach(p => {
    const node = map.get(p.slug)!;
    if (p.parent_slug && map.has(p.parent_slug)) {
      map.get(p.parent_slug)!.children!.push(node);
    } else {
      tree.push(node);
    }
  });

    return tree;
  };

  const tree = buildTree(list);

  // Load a specific policy for editing
  async function load(s: string) {
    const { data, error } = await supa
      .from('policies')
      .select('*')
      .eq('slug', s)
      .single();

    if (!error && data) {
      setSlug(data.slug);
      setTitle(data.title);
      setSummary(data.summary || '');
      setBodyHtml(data.body_md || '<p></p>');
      setParentSlug(data.parent_slug || '');
      setBoxFolderId((data as any).box_folder_id || '');
      setBoxFileIdsText(((data as any).box_file_ids || []).join(','));
    }
  }

  // Save/update via API (token-gated)
  async function save() {
    if (!token) {
      alert('Missing edit token');
      return;
    }
    const res = await fetch('/api/policies/upsert', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-edit-token': token,
      },
      body: JSON.stringify({
        slug,
        title,
        summary,
        body_md: bodyHtml,
        parent_slug: parentSlug || null,
        box_folder_id: boxFolderId || null,
        box_file_ids: boxFileIdsText
          ? boxFileIdsText.split(',').map((s) => s.trim()).filter(Boolean)
          : null,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      alert('Save failed: ' + text);
    } else {
      alert('Saved');
      // Refresh list to show updated tree
      const { data } = await supa
        .from('policies')
        .select('slug,title,parent_slug')
        .order('title', { ascending: true });
      if (data) setList(data);
    }
  }

  // Recursive tree rendering
  const TreeNode = ({ node, level = 0 }: { node: PolicyTree; level?: number }) => (
    <li className="list-none">
      <button
        className="underline hover:text-blue-600 block w-full text-left"
        style={{ paddingLeft: `${level * 20}px` }}
        onClick={() => load(node.slug)}
      >
        {level > 0 && '└ '}{node.title}
      </button>
      {node.children && node.children.length > 0 && (
        <ul className="mt-1">
          {node.children.map((child: PolicyTree) => (
            <TreeNode key={child.slug} node={child} level={level + 1} />
          ))}
        </ul>
      )}
    </li>
  );

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Knowledge Editor</h1>

      {/* Token input */}
      <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <label className="block text-sm font-medium mb-2">
          Edit Token (Required to save changes)
        </label>
        <input
          type="password"
          placeholder="Enter your EDIT_TOKEN from .env.local"
          className="border p-2 w-full max-w-lg rounded"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
        <p className="text-xs text-gray-600 mt-1">
          💡 Find this in your <code className="bg-gray-100 px-1 rounded">.env.local</code> file as <code className="bg-gray-100 px-1 rounded">EDIT_TOKEN</code>
        </p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar list with tree view */}
        <aside className="w-72 border p-2 h-[70vh] overflow-auto">
          <button
            className="mb-2 w-full px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 font-medium"
            onClick={() => {
              setSlug('');
              setTitle('');
              setSummary('');
              setBodyHtml('<p></p>');
              setParentSlug('');
              setBoxFolderId('');
              setBoxFileIdsText('');
            }}
          >
            + New Article
          </button>
          <div className="text-xs text-gray-500 mb-2 mt-3 font-medium">CONTENT TREE</div>
          <ul className="space-y-1">
            {tree.map((node) => (
              <TreeNode key={node.slug} node={node} />
            ))}
          </ul>
        </aside>

        {/* Editor panel */}
        <section className="flex-1 space-y-3">
          <input
            placeholder="slug (kebab-case)"
            className="w-full border p-2 rounded"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
          <input
            placeholder="Title"
            className="w-full border p-2 rounded"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            placeholder="Summary"
            className="w-full border p-2 rounded"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
          
          {/* Parent page selector */}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Parent Page (optional - for nested pages)
            </label>
            <select
              className="w-full border p-2 rounded bg-white"
              value={parentSlug}
              onChange={(e) => setParentSlug(e.target.value)}
            >
              <option value="">None (Top Level)</option>
              {list
                .filter(p => p.slug !== slug) // Don't allow selecting itself as parent
                .map(p => (
                  <option key={p.slug} value={p.slug}>
                    {p.title}
                  </option>
                ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Select a parent to nest this page under another page
            </p>
          </div>

          {/* Box linking */}
          <div className="mt-2 p-3 border rounded bg-gray-50">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="flex flex-col">
                <label className="text-sm font-medium mb-1 text-gray-700">
                  Box Folder ID (for Related Files panel)
                </label>
                <input
                  className="w-full border p-2 rounded"
                  placeholder="e.g. 0 or a specific folder id"
                  value={boxFolderId}
                  onChange={(e) => setBoxFolderId(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Set to a specific Box folder ID to show a read/preview-only file tree on the article page.
                </p>
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-medium mb-1 text-gray-700">
                  Box File IDs (comma-separated)
                </label>
                <input
                  className="w-full border p-2 rounded"
                  placeholder="12345, 67890"
                  value={boxFileIdsText}
                  onChange={(e) => setBoxFileIdsText(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Optional: add specific file IDs to link under the tree.
                </p>
              </div>
            </div>
          </div>

          <PolicyEditor value={bodyHtml} onChange={setBodyHtml} token={token} />
          <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium" onClick={save}>
            Save Article
          </button>
        </section>
      </div>
    </main>
  );
}
