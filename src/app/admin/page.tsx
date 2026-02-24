'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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
  // Sections
  const [sectionKey, setSectionKey] = useState('');
  const [sections, setSections] = useState<{ key: string; name: string }[]>([]);

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
  const [experience, setExperience] = useState('');

  // Fetch all policies for the sidebar
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/policies/list');
        if (res.ok) {
          const data = await res.json();
          setList(data);
        }
      } catch (error) {
        console.error('Failed to fetch policies:', error);
      }
    })();
  }, []);

  // Fetch sections for section selector
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/sections/list');
        if (res.ok) {
          const data = await res.json();
          setSections(data as { key: string; name: string }[]);
        }
      } catch (error) {
        console.error('Failed to fetch sections:', error);
      }
    })();
  }, []);

  // Fetch profiles list for sidebar
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/profiles/list');
        if (res.ok) {
          const data = await res.json();
          setProfiles(data as ProfileListItem[]);
        }
      } catch (error) {
        console.error('Failed to fetch profiles:', error);
      }
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
    try {
      const res = await fetch(`/api/policies/get?slug=${encodeURIComponent(s)}`);
      if (res.ok) {
        const data = await res.json();
        setContentType('knowledge');
        setSlug(data.slug);
        setTitle(data.title);
        setSummary((data as { summary?: string | null }).summary || '');
        setBodyHtml((data as { body_md?: string | null }).body_md || '<p></p>');
        setParentSlug((data as { parent_slug?: string | null }).parent_slug || '');
        setSectionKey((data as { section_key?: string | null }).section_key || '');
        const boxFolder = (data as { box_folder_id?: string | null }).box_folder_id || '';
        const boxFiles = (data as { box_file_ids?: string[] | null }).box_file_ids || [];
        setBoxFolderId(boxFolder);
        setBoxFileIdsText(boxFiles.join(','));
      } else {
        console.error('Failed to load policy:', await res.text());
      }
    } catch (error) {
      console.error('Failed to load policy:', error);
    }
  }

  // Load a specific profile for editing
  async function loadProfile(s: string) {
    try {
      const res = await fetch(`/api/profiles/get?slug=${encodeURIComponent(s)}`);
      if (res.ok) {
        const data = await res.json();
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
        setExperience((row as { experience?: string | null }).experience || '');
      } else {
        console.error('Failed to load profile:', await res.text());
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
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
        experience: experience || null,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      alert('Save profile failed: ' + text);
    } else {
      alert('Profile saved');
      const refreshRes = await fetch('/api/profiles/list');
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        setProfiles(data as ProfileListItem[]);
      }
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

    const refreshRes = await fetch('/api/profiles/list');
    if (refreshRes.ok) {
      const data = await refreshRes.json();
      setProfiles(data as ProfileListItem[]);
    }
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
    const refreshRes = await fetch('/api/policies/list');
    if (refreshRes.ok) {
      const data = await refreshRes.json();
      setList(data);
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
        section_key: sectionKey || null,
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
      const refreshRes = await fetch('/api/policies/list');
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        setList(data);
      }
    }
  }

  // Recursive tree rendering
  const TreeNode = ({ node, level = 0 }: { node: PolicyTree; level?: number }) => (
    <li className="list-none">
      <button
        className="text-[#667eea] hover:text-[#764ba2] block w-full text-left text-sm py-1 transition-colors"
        style={{ paddingLeft: `${level * 16}px` }}
        onClick={() => load(node.slug)}
      >
        {level > 0 && <span className="text-[#ccc] mr-1">└</span>}{node.title}
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
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <nav className="max-w-[1400px] mx-auto px-8 py-6 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
            <svg className="h-8" viewBox="0 0 1860 612" xmlns="http://www.w3.org/2000/svg">
              <path d="m1404.7,133.12l63.12,345.76h-100.16l-25.07-198.92-54.78,198.92h-89.89l-54.78-198.92-25.07,198.92h-100.15l63.12-345.76h105.96l55.88,203.16,55.88-203.16h105.96Zm-476.91,0l-81.54,233.33-81.54-233.33h-103.74l130.59,345.76h109.39l130.59-345.76h-103.74Zm685.34,257.25V133.12h-95.82v345.76h237.67l33.43-88.52h-175.27Zm-1051.13,123.31v48.33h-48.33l-207.67-207.67-207.67,207.67h-48.33v-48.33s207.67-207.67,207.67-207.67L50,98.33v-48.33s48.33,0,48.33,0l207.67,207.67,207.67-207.67h48.33v48.33l-207.67,207.67s207.67,207.67,207.67,207.67ZM356.77,50l-50.77,50.77-50.77-50.77h-87.33l138.09,138.09L444.09,50h-87.33Zm87.33,512l-138.09-138.09-138.09,138.09h87.33l50.77-50.77,50.77,50.77h87.33Zm117.91-205.23l-50.77-50.77,50.77-50.77v-87.33l-138.09,138.09,138.09,138.09v-87.33ZM50,444.09l138.09-138.09L50,167.91v87.33l50.77,50.77-50.77,50.77v87.33Z" fill="#1a1a1a"/>
            </svg>
          </Link>
          <ul className="hidden md:flex gap-10 list-none">
            <li><Link href="/" className="text-[#4a4a4a] no-underline font-medium text-[0.95rem] hover:text-black transition-colors">Home</Link></li>
            <li><Link href="/people" className="text-[#4a4a4a] no-underline font-medium text-[0.95rem] hover:text-black transition-colors">People</Link></li>
            <li><Link href="/files" className="text-[#4a4a4a] no-underline font-medium text-[0.95rem] hover:text-black transition-colors">Resources</Link></li>
            <li><Link href="/admin" className="text-[#4a4a4a] no-underline font-medium text-[0.95rem] hover:text-black transition-colors">Admin</Link></li>
          </ul>
        </nav>
      </header>

      <main className="max-w-[1400px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-[#1a1a1a]">Knowledge Editor</h1>
          <a href="/admin/import" className="text-sm text-[#667eea] hover:text-[#764ba2] transition-colors">
            Import (JSON/XML)
          </a>
        </div>

        {/* Token input */}
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-xl">
          <label className="block text-sm font-semibold mb-2 text-[#1a1a1a]">
            Edit Token (Required to save changes)
          </label>
          <input
            type="password"
            placeholder="Enter your EDIT_TOKEN from .env.local"
            className="border border-gray-300 p-3 w-full max-w-lg rounded-lg focus:outline-none focus:ring-2 focus:ring-[#667eea]"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
          <p className="text-xs text-[#666] mt-2">
            Find this in your <code className="bg-gray-200 px-1.5 py-0.5 rounded text-[#1a1a1a]">.env.local</code> file as <code className="bg-gray-200 px-1.5 py-0.5 rounded text-[#1a1a1a]">EDIT_TOKEN</code>
          </p>
        </div>

        <div className="flex gap-8">
          {/* Sidebar list with tree view */}
          <aside className="w-72 border border-gray-200 rounded-xl p-4 h-[70vh] overflow-auto bg-gray-50">
            <button
              className="mb-4 w-full px-4 py-3 text-white rounded-lg font-semibold transition-all hover:shadow-lg"
              style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
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
            <div className="text-xs text-[#999] mb-2 mt-3 font-semibold uppercase tracking-wider">Content Tree</div>
            <ul className="space-y-1">
              {tree.map((node) => (
                <TreeNode key={node.slug} node={node} />
              ))}
            </ul>

            <div className="text-xs text-[#999] mb-2 mt-6 font-semibold uppercase tracking-wider">People</div>
            <button
              className="mb-4 w-full px-4 py-3 text-white rounded-lg font-semibold transition-all hover:shadow-lg"
              style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}
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
                    className="text-[#667eea] hover:text-[#764ba2] block w-full text-left text-sm py-1 transition-colors"
                    onClick={() => loadProfile(p.slug)}
                  >
                    {p.last_name}, {p.first_name}
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          {/* Editor panel */}
          <section className="flex-1 space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-[#1a1a1a]">
                Content Type
              </label>
              <select
                className="w-full border border-gray-300 p-3 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#667eea]"
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
              className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#667eea]"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
            <input
              placeholder="Title"
              className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#667eea] mt-3"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <input
              placeholder="Summary"
              className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#667eea] mt-3"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />

            {/* Parent page selector */}
            <div className="mt-3">
              <label className="block text-sm font-semibold mb-2 text-[#1a1a1a]">
                Parent Page (optional - for nested pages)
              </label>
              <select
                className="w-full border border-gray-300 p-3 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#667eea]"
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
              <p className="text-xs text-[#666] mt-1">
                Select a parent to nest this page under another page
              </p>
            </div>

            {/* Section selector */}
            <div className="mt-3">
              <label className="block text-sm font-semibold mb-2 text-[#1a1a1a]">
                Section (optional - used on the homepage)
              </label>
              <select
                className="w-full border border-gray-300 p-3 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#667eea]"
                value={sectionKey}
                onChange={(e) => setSectionKey(e.target.value)}
              >
                <option value="">Unassigned</option>
                {sections.map((s) => (
                  <option key={s.key} value={s.key}>{s.name}</option>
                ))}
              </select>
              <p className="text-xs text-[#666] mt-1">
                Choose a section to group this article on the homepage.
              </p>
            </div>

            {/* Box linking */}
            <div className="mt-4 p-4 border border-gray-200 rounded-xl bg-gray-50">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col">
                  <label className="text-sm font-semibold mb-2 text-[#1a1a1a]">
                    Box Folder ID (for Related Files panel)
                  </label>
                  <input
                    className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#667eea]"
                    placeholder="e.g. 0 or a specific folder id"
                    value={boxFolderId}
                    onChange={(e) => setBoxFolderId(e.target.value)}
                  />
                  <p className="text-xs text-[#666] mt-1">
                    Set to a specific Box folder ID to show a read/preview-only file tree on the article page.
                  </p>
                </div>

                <div className="flex flex-col">
                  <label className="text-sm font-semibold mb-2 text-[#1a1a1a]">
                    Box File IDs (comma-separated)
                  </label>
                  <input
                    className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#667eea]"
                    placeholder="12345, 67890"
                    value={boxFileIdsText}
                    onChange={(e) => setBoxFileIdsText(e.target.value)}
                  />
                  <p className="text-xs text-[#666] mt-1">
                    Optional: add specific file IDs to link under the tree.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <PolicyEditor value={bodyHtml} onChange={setBodyHtml} token={token} />
            </div>
            <div className="flex gap-3 mt-4">
              <button
                className="px-6 py-3 text-white rounded-lg font-semibold transition-all hover:shadow-lg"
                style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                onClick={save}
              >
                Save Article
              </button>
              <button
                className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#667eea]"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
              />
              <div className="grid gap-3 md:grid-cols-2 mt-3">
                <input
                  placeholder="First Name"
                  className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#667eea]"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
                <input
                  placeholder="Last Name"
                  className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#667eea]"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
                <input
                  placeholder="Job Title"
                  className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#667eea]"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                />
                <input
                  placeholder="Email Address"
                  className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#667eea]"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="mt-3">
                <label className="block text-sm font-semibold mb-2 text-[#1a1a1a]">
                  Main Clients serviced (comma-separated)
                </label>
                <input
              className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#667eea]"
              placeholder="Client A, Client B"
              value={clientsText}
              onChange={(e) => setClientsText(e.target.value)}
            />
              </div>

              <div className="mt-3">
                <label className="block text-sm font-semibold mb-2 text-[#1a1a1a]">
                  Past work experience (comma-separated)
                </label>
                <input
                  className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#667eea]"
                  placeholder="Creative Director at VML South Africa (2015-2018), Copywriter at Joe Public (2010-2012)"
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-3 mt-3">
                <input
                  className="flex-1 border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#667eea]"
                  placeholder="Photo URL"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                />
                <button
                  type="button"
                  className="px-4 py-3 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm font-medium transition-colors"
                  onClick={uploadPhoto}
                >
                  Upload…
                </button>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-semibold mb-2 text-[#1a1a1a]">
                  Profile description
                </label>
                <PolicyEditor value={profileDescHtml} onChange={setProfileDescHtml} token={token} />
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  className="px-6 py-3 text-white rounded-lg font-semibold transition-all hover:shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}
                  onClick={saveProfile}
                >
                  Save Profile
                </button>
                <button
                  className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
    </div>
  );
}
