'use client';

import { useEffect, useState } from 'react';
import { supa } from '@/lib/supabase';
import PolicyEditor from '@/components/PolicyEditor';

interface Policy {
  slug: string;
  title: string;
  parent_slug: string | null;
}

// People profiles types
interface ProfileListItem {
  slug: string;
  first_name: string;
  last_name: string;
  job_title: string;
}

interface ProfileRow extends ProfileListItem {
  email: string;
  clients: string[] | null;
  photo_url: string | null;
  description_html: string | null;
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

  // Content type
  const [contentType, setContentType] = useState<'knowledge' | 'profile'>('knowledge');

  // People (profiles) state
  const [profiles, setProfiles] = useState<{ slug: string; first_name: string; last_name: string; job_title: string }[]>([]);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [profileDescHtml, setProfileDescHtml] = useState('<p></p>');
  const [clientsText, setClientsText] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [email, setEmail] = useState('');

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

  // Fetch profiles list for sidebar
  useEffect(() => {
    (async () => {
      const { data } = await supa
        .from('profiles')
        .select('slug,first_name,last_name,job_title')
        .order('last_name', { ascending: true });
      if (data) setProfiles(data as ProfileListItem[]);
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
      setContentType('knowledge');
      setSlug(data.slug);
      setTitle(data.title);
      setSummary((data as { summary?: string | null }).summary || '');
      setBodyHtml((data as { body_md?: string | null }).body_md || '<p></p>');
      setParentSlug((data as { parent_slug?: string | null }).parent_slug || '');
      const boxFolder = (data as { box_folder_id?: string | null }).box_folder_id || '';
      const boxFiles = (data as { box_file_ids?: string[] | null }).box_file_ids || [];
      setBoxFolderId(boxFolder);
      setBoxFileIdsText(boxFiles.join(','));
    }
  }

  // Load a specific profile for editing
  async function loadProfile(s: string) {
    const { data, error } = await supa
      .from('profiles')
      .select('*')
      .eq('slug', s)
      .single();

    if (!error && data) {
      setContentType('profile');
      const row = data as ProfileRow;
      setSlug(row.slug || '');
      setFirstName(row.first_name || '');
      setLastName(row.last_name || '');
      setJobTitle(row.job_title || '');
      setEmail(row.email || '');
      setClientsText(Array.isArray(row.clients) ? (row.clients as string[]).join(',') : '');
      setPhotoUrl(row.photo_url || '');
      setProfileDescHtml(row.description_html || '<p></p>');
    }
  }

  // Upload profile photo via /api/upload
  async function uploadPhoto() {
    if (!token) {
      alert('Missing edit token');
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', headers: { 'x-edit-token': token }, body: fd });
      if (!res.ok) {
        alert('Upload failed: ' + (await res.text()));
        return;
      }
      const { url } = (await res.json()) as { url: string };
      setPhotoUrl(url);
    };
    input.click();
  }

  // Save current profile
  async function saveProfile() {
    if (!token) {
      alert('Missing edit token');
      return;
    }
    if (!slug) {
      alert('Please enter a slug');
      return;
    }
    const res = await fetch('/api/profiles/upsert', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-edit-token': token },
      body: JSON.stringify({
        slug,
        first_name: firstName,
        last_name: lastName,
        job_title: jobTitle,
        description_html: profileDescHtml,
        clients: clientsText ? clientsText.split(',').map((s) => s.trim()).filter(Boolean) : [],
        photo_url: photoUrl || null,
        email,
        status: 'approved',
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      alert('Save profile failed: ' + text);
    } else {
      alert('Profile saved');
      const { data } = await supa
        .from('profiles')
        .select('slug,first_name,last_name,job_title')
        .order('last_name', { ascending: true });
      if (data) setProfiles(data as ProfileListItem[]);
    }
  }

  // Delete current profile
  async function delProfile() {
    if (!slug) {
      alert('No profile loaded.');
      return;
    }
    if (!token) {
      alert('Missing edit token');
      return;
    }
    const confirmed = window.confirm(`Delete profile "${firstName} ${lastName}" permanently?`);
    if (!confirmed) return;

    const res = await fetch('/api/profiles/delete', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-edit-token': token },
      body: JSON.stringify({ slug }),
    });
    if (!res.ok) {
      const text = await res.text();
      alert('Delete profile failed: ' + text);
      return;
    }

    alert('Profile deleted');
    setSlug('');
    setFirstName('');
    setLastName('');
    setJobTitle('');
    setEmail('');
    setClientsText('');
    setPhotoUrl('');
    setProfileDescHtml('<p></p>');

    const { data } = await supa
      .from('profiles')
      .select('slug,first_name,last_name,job_title')
      .order('last_name', { ascending: true });
    if (data) setProfiles(data as ProfileListItem[]);
  }

  // Delete current article (token-gated)
  async function del() {
    if (!slug) {
      alert('No article loaded. Select an article to delete.');
      return;
    }
    if (!token) {
      alert('Missing edit token');
      return;
    }
    const confirmed = window.confirm(
      `Delete article "${title || slug}" permanently? This cannot be undone.`
    );
    if (!confirmed) return;

    const res = await fetch('/api/policies/delete', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-edit-token': token,
      },
      body: JSON.stringify({ slug }),
    });

    if (!res.ok) {
      const text = await res.text();
      alert('Delete failed: ' + text);
      return;
    }

    alert('Deleted');

    // Clear editor fields
    setSlug('');
    setTitle('');
    setSummary('');
    setBodyHtml('<p></p>');
    setParentSlug('');
    setBoxFolderId('');
    setBoxFileIdsText('');

    // Refresh list to reflect deletion
    const { data } = await supa
      .from('policies')
      .select('slug,title,parent_slug')
      .order('title', { ascending: true });
    if (data) setList(data);
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
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Knowledge Editor</h1>
        <a href="/admin/import" className="text-sm text-blue-600 hover:underline">
          Import (JSON/XML)
        </a>
      </div>

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
              setContentType('knowledge');
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

          <div className="text-xs text-gray-500 mb-2 mt-4 font-medium">PEOPLE</div>
          <button
            className="mb-2 w-full px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 font-medium"
            onClick={() => {
              setContentType('profile');
              setSlug('');
              setFirstName('');
              setLastName('');
              setJobTitle('');
              setEmail('');
              setClientsText('');
              setPhotoUrl('');
              setProfileDescHtml('<p></p>');
            }}
          >
            + New Profile
          </button>
          <ul className="space-y-1">
            {profiles.map((p) => (
              <li key={p.slug} className="list-none">
                <button
                  className="underline hover:text-blue-600 block w-full text-left"
                  onClick={() => loadProfile(p.slug)}
                >
                  {p.last_name}, {p.first_name} — {p.job_title}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* Editor panel */}
        <section className="flex-1 space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Content Type
            </label>
            <select
              className="w-full border p-2 rounded bg-white"
              value={contentType}
              onChange={(e) => setContentType(e.target.value as 'knowledge' | 'profile')}
            >
              <option value="knowledge">Knowledge Article</option>
              <option value="profile">Profile Page</option>
            </select>
          </div>
          <div className={contentType === 'knowledge' ? '' : 'hidden'}>
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
          <div className="flex gap-2">
            <button
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium"
              onClick={save}
            >
              Save Article
            </button>
            <button
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={del}
              disabled={!slug}
              title={!slug ? 'Load an article first' : 'Delete this article'}
            >
              Delete
            </button>
          </div>

          </div>

          {/* Profile form */}
          <div className={contentType === 'profile' ? '' : 'hidden'}>
            <input
              placeholder="slug (kebab-case)"
              className="w-full border p-2 rounded"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
            <div className="grid gap-3 md:grid-cols-2">
              <input
                placeholder="First Name"
                className="w-full border p-2 rounded"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
              <input
                placeholder="Last Name"
                className="w-full border p-2 rounded"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
              <input
                placeholder="Job Title"
                className="w-full border p-2 rounded"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
              />
              <input
                placeholder="Email Address"
                className="w-full border p-2 rounded"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                Main Clients serviced (comma-separated)
              </label>
              <input
                className="w-full border p-2 rounded"
                placeholder="Client A, Client B"
                value={clientsText}
                onChange={(e) => setClientsText(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                className="flex-1 border p-2 rounded"
                placeholder="Photo URL"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
              />
              <button
                type="button"
                className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm"
                onClick={uploadPhoto}
              >
                Upload…
              </button>
            </div>

            <div className="mt-2">
              <label className="block text-sm font-medium mb-1 text-gray-700">
                Profile description
              </label>
              <PolicyEditor value={profileDescHtml} onChange={setProfileDescHtml} token={token} />
            </div>

            <div className="flex gap-2">
              <button
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium"
                onClick={saveProfile}
              >
                Save Profile
              </button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={delProfile}
                disabled={!slug}
                title={!slug ? 'Load a profile first' : 'Delete this profile'}
              >
                Delete Profile
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
