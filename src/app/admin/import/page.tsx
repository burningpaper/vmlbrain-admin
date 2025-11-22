'use client';

import { useMemo, useState } from 'react';

type ImportAsset = {
  filename: string;
  mime_type: string;
  data_base64: string;
  alt?: string;
};

type ImportArticle = {
  slug: string;
  title: string;
  summary?: string | null;
  body_html: string;
  parent_slug?: string | null;
  audience?: string[];
  status?: 'approved' | 'draft';
  box_folder_id?: string | null;
  box_file_ids?: string[] | null;
  assets?: ImportAsset[];
};

type ImportProfile = {
  slug: string;
  first_name: string;
  last_name: string;
  job_title: string;
  email: string;
  description_html: string;
  clients?: string[] | null;
  photo_url?: string | null;
  status?: 'approved' | 'draft';
  experience?: string | null;
};
type ImportPayload = {
  version: string;
  source?: string;
  articles: ImportArticle[];
  profiles?: ImportProfile[];
};

function isKebabCaseSlug(s: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s);
}

function guessFormat(text: string): 'json' | 'xml' {
  const t = text.trim();
  if (t.startsWith('{') || t.startsWith('[')) return 'json';
  if (t.startsWith('<')) return 'xml';
  return 'json';
}

function parseJSON(text: string): ImportPayload {
  const obj = JSON.parse(text);
  if (!obj || typeof obj !== 'object') throw new Error('Invalid JSON root');
  if (!Array.isArray((obj as ImportPayload).articles) && !Array.isArray((obj as ImportPayload).profiles)) {
    throw new Error('JSON must have either "articles" or "profiles" array');
  }
  return obj as ImportPayload;
}

function parseXML(text: string): ImportPayload {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'application/xml');
  const err = doc.querySelector('parsererror');
  if (err) throw new Error('Invalid XML');

  const root = doc.querySelector('kb, KB');
  if (!root) throw new Error('XML must have root <kb>');

  const version = root.getAttribute('version') || '1.0';
  const source = root.getAttribute('source') || undefined;

  const articles: ImportArticle[] = [];
  const profiles: ImportProfile[] = [];

  const articlesEl = root.querySelector('articles');
  if (articlesEl) {
    const articleEls = Array.from(articlesEl.querySelectorAll(':scope > article'));
    for (const a of articleEls) {
      const get = (tag: string) => a.querySelector(tag)?.textContent ?? '';
      const getOpt = (tag: string) => {
        const val = a.querySelector(tag)?.textContent ?? '';
        return val === '' ? null : val;
      };
      const slug = get('slug').trim();
      const title = get('title').trim();
      const summary = (a.querySelector('summary')?.textContent ?? '').trim() || null;

      // body_html inside CDATA or text
      const bodyNode = a.querySelector('body_html');
      let body_html = '';
      if (bodyNode) {
        // Collect textContent, which includes CDATA content
        body_html = bodyNode.textContent || '';
      }

      const parent_slug_raw = (a.querySelector('parent_slug')?.textContent ?? '').trim();
      const parent_slug = parent_slug_raw === '' ? null : parent_slug_raw;

      // audience
      const aud: string[] = [];
      const audVals = Array.from(a.querySelectorAll('audience > value'));
      for (const v of audVals) {
        const t = (v.textContent || '').trim();
        if (t) aud.push(t);
      }

      // status
      const statusText = (a.querySelector('status')?.textContent || '').trim();
      const status = statusText === 'draft' ? 'draft' : statusText === 'approved' ? 'approved' : undefined;

      const box_folder_id = getOpt('box_folder_id');
      const box_file_ids: string[] | null = (() => {
        const idsEl = a.querySelector('box_file_ids');
        if (!idsEl) return null;
        const arr = (idsEl.textContent || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        return arr.length ? arr : null;
      })();

      // assets
      const assets: ImportAsset[] = [];
      const assetEls = Array.from(a.querySelectorAll(':scope > assets > asset'));
      for (const as of assetEls) {
        const filename = (as.querySelector('filename')?.textContent || '').trim();
        const mime_type = (as.querySelector('mime_type')?.textContent || '').trim();
        const data_base64 = (as.querySelector('data_base64')?.textContent || '').replace(/\s+/g, '');
        const alt = (as.querySelector('alt')?.textContent || '').trim() || undefined;
        if (filename && mime_type && data_base64) {
          assets.push({ filename, mime_type, data_base64, alt });
        }
      }

      const article: ImportArticle = {
        slug,
        title,
        summary,
        body_html,
        parent_slug,
        audience: aud.length ? aud : undefined,
        status,
        box_folder_id,
        box_file_ids,
        assets: assets.length ? assets : undefined,
      };
      articles.push(article);
    }
  }

  const profilesEl = root.querySelector('profiles');
  if (profilesEl) {
    const profileEls = Array.from(profilesEl.querySelectorAll(':scope > profile'));
    for (const p of profileEls) {
      const get = (tag: string) => p.querySelector(tag)?.textContent ?? '';
      const slug = get('slug').trim();
      const first_name = get('first_name').trim();
      const last_name = get('last_name').trim();
      const job_title = get('job_title').trim();
      const email = get('email').trim();
      const description_html = get('description_html').trim();
      const clientsRaw = (p.querySelector('clients')?.textContent || '').trim();
      const clients = clientsRaw
        ? clientsRaw
            .split(',')
            .map((c) => c.trim())
            .filter(Boolean)
        : [];
      const photo_url = get('photo_url').trim() || null;
      const statusText = get('status').trim();
      const status = statusText === 'draft' ? 'draft' : statusText === 'approved' ? 'approved' : undefined;
      const experience = get('experience').trim() || null;

      profiles.push({
        slug,
        first_name,
        last_name,
        job_title,
        email,
        description_html,
        clients,
        photo_url,
        status,
        experience,
      });
    }
  }

  return { version, source, articles, profiles };
}

async function uploadAsset(token: string, asset: ImportAsset): Promise<string> {
  const fd = new FormData();
  // Reconstruct a File from base64 in browser
  const byteChars = atob(asset.data_base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const file = new File([byteArray], asset.filename, { type: asset.mime_type });
  fd.append('file', file);

  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'x-edit-token': token },
    body: fd,
  });
  if (!res.ok) {
    throw new Error(`Upload failed for ${asset.filename}: ${await res.text()}`);
  }
  const { url } = (await res.json()) as { url: string };
  return url;
}

function rewriteAssetsSrc(bodyHtml: string, map: Record<string, string>): string {
  let html = bodyHtml;
  for (const [filename, url] of Object.entries(map)) {
    // replace src="assets://filename" or src='assets://filename'
    const re = new RegExp(`src=(["'])assets://${filename.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\1`, 'g');
    html = html.replace(re, `src="${url}"`);
  }
  return html;
}

export default function ImportPage() {
  const [token, setToken] = useState('');
  const [raw, setRaw] = useState('');
  const [format, setFormat] = useState<'json' | 'xml'>('json');
  const [parsed, setParsed] = useState<ImportPayload | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string>('');
  const [mode, setMode] = useState<'articles' | 'profiles'>('articles');


  const detected = useMemo(() => guessFormat(raw), [raw]);

function validatePayload(p: ImportPayload) {
  const errors: string[] = [];
  const seenArticles = new Set<string>();
  const seenProfiles = new Set<string>();

  if (p.articles && Array.isArray(p.articles)) {
    for (const art of p.articles) {
      if (!art.slug) errors.push('Article missing slug.');
      if (art.slug && !isKebabCaseSlug(art.slug)) errors.push(`Invalid slug: ${art.slug} (must be lowercase-kebab-case)`);
      if (art.slug && seenArticles.has(art.slug)) errors.push(`Duplicate article slug in payload: ${art.slug}`);
      if (art.slug) seenArticles.add(art.slug);
      if (!art.title) errors.push(`Missing title for slug ${art.slug}`);
      if (!art.body_html) errors.push(`Missing body_html for slug ${art.slug}`);
      if (art.box_folder_id && !/^\d+$/.test(art.box_folder_id)) errors.push(`box_folder_id must be numeric for slug ${art.slug}`);
      if (art.box_file_ids && art.box_file_ids.some((id) => !/^\d+$/.test(id))) errors.push(`box_file_ids must be numeric strings for slug ${art.slug}`);
      if (art.assets) {
        for (const as of art.assets) {
          if (!as.filename || !as.mime_type || !as.data_base64) {
            errors.push(`Asset missing fields for slug ${art.slug}`);
          }
        }
      }
    }
  }

  if (p.profiles && Array.isArray(p.profiles)) {
    for (const prof of p.profiles) {
      if (!prof.slug) errors.push('Profile missing slug.');
      if (prof.slug && !isKebabCaseSlug(prof.slug)) errors.push(`Invalid profile slug: ${prof.slug} (must be lowercase-kebab-case)`);
      if (prof.slug && seenProfiles.has(prof.slug)) errors.push(`Duplicate profile slug in payload: ${prof.slug}`);
      if (prof.slug) seenProfiles.add(prof.slug);
      if (!prof.first_name) errors.push(`Profile ${prof.slug || ''} missing first_name`);
      if (!prof.last_name) errors.push(`Profile ${prof.slug || ''} missing last_name`);
      if (!prof.job_title) errors.push(`Profile ${prof.slug || ''} missing job_title`);
      if (!prof.email) errors.push(`Profile ${prof.slug || ''} missing email`);
      if (!prof.description_html) errors.push(`Profile ${prof.slug || ''} missing description_html`);
      if (prof.experience && typeof prof.experience !== 'string') errors.push(`Profile ${prof.slug || ''} experience must be text`);
    }
  }

  if ((!p.articles || p.articles.length === 0) && (!p.profiles || p.profiles.length === 0)) {
    errors.push('No articles or profiles found.');
  }
  return errors;
}

  function handleValidate() {
    try {
      const fmt = format || detected;
      const payload = fmt === 'json' ? parseJSON(raw) : parseXML(raw);
      const errs = validatePayload(payload);
      if (errs.length) {
        setParsed(null);
        setPreview(`Validation errors:\n- ${errs.join('\n- ')}`);
      } else {
        setParsed(payload);
        if (mode === 'articles') {
          const titles = (payload.articles || []).map((a) => `• ${a.slug} — ${a.title}${a.parent_slug ? ` (parent: ${a.parent_slug})` : ''}`).join('\n');
          setPreview(`Parsed ${(payload.articles || []).length} articles:\n${titles}`);
        } else {
          const names = (payload.profiles || []).map((p) => `• ${p.slug} — ${p.first_name} ${p.last_name} (${p.job_title})`).join('\n');
          setPreview(`Parsed ${(payload.profiles || []).length} profiles:\n${names}`);
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setParsed(null);
      setPreview(`Parse error: ${msg}`);
    }
  }

  async function handleImport() {
    if (!token) {
      alert('Missing edit token');
      return;
    }
    if (!parsed) {
      alert('Nothing to import. Validate first.');
      return;
    }
    setBusy(true);
    setLog('');
    const appendLog = (s: string) => setLog((l) => l + s + '\n');

    try {
      // Preprocess: upload assets and rewrite src for each article once
      if (mode === 'articles') {
        appendLog('Preprocessing assets…');
        const processedHtml = new Map<string, string>();
        for (const art of parsed.articles || []) {
          let html = art.body_html;
          const map: Record<string, string> = {};
          if (art.assets && art.assets.length) {
            for (const as of art.assets) {
              appendLog(`  Uploading asset ${as.filename} for ${art.slug}…`);
              const url = await uploadAsset(token, as);
              map[as.filename] = url;
            }
            html = rewriteAssetsSrc(html, map);
          }
          processedHtml.set(art.slug, html);
        }

        // Pass 1: seed all pages with parent_slug = null to avoid FK violations
        appendLog('Seeding pages (parent_slug=null)…');
        for (const art of parsed.articles || []) {
          appendLog(`  Seeding ${art.slug}…`);
          const res = await fetch('/api/policies/upsert', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-edit-token': token,
            },
            body: JSON.stringify({
              slug: art.slug,
              title: art.title,
              summary: art.summary || null,
              body_md: processedHtml.get(art.slug) || art.body_html,
              parent_slug: null,
              audience: art.audience || ['All'],
              status: art.status || 'approved',
              box_folder_id: art.box_folder_id || null,
              box_file_ids: art.box_file_ids || null,
            }),
          });
          if (!res.ok) {
            const t = await res.text();
            appendLog(`  ERROR: seed upsert failed for ${art.slug}: ${t}`);
            throw new Error(`Seed upsert failed for ${art.slug}`);
          }
        }

        // Pass 2: apply real parent_slug (if provided). If a parent is missing, log the error and continue.
        appendLog('Applying parent relationships…');
        for (const art of parsed.articles || []) {
          if (!art.parent_slug) continue;
          appendLog(`  Setting parent of ${art.slug} -> ${art.parent_slug}`);
          const res = await fetch('/api/policies/upsert', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-edit-token': token,
            },
            body: JSON.stringify({
              slug: art.slug,
              title: art.title,
              summary: art.summary || null,
              body_md: processedHtml.get(art.slug) || art.body_html,
              parent_slug: art.parent_slug,
              audience: art.audience || ['All'],
              status: art.status || 'approved',
              box_folder_id: art.box_folder_id || null,
              box_file_ids: art.box_file_ids || null,
            }),
          });
          if (!res.ok) {
            const t = await res.text();
            appendLog(`  ERROR: parent update failed for ${art.slug}: ${t}`);
            // Do not throw here so the rest can still complete; user can re-run after fixing parents.
          }
        }
      } else {
        appendLog('Importing profiles…');
        for (const prof of parsed.profiles || []) {
          appendLog(`  Upserting profile ${prof.slug}…`);
          const res = await fetch('/api/profiles/upsert', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-edit-token': token,
            },
            body: JSON.stringify({
              slug: prof.slug,
              first_name: prof.first_name,
              last_name: prof.last_name,
              job_title: prof.job_title,
              email: prof.email,
              description_html: prof.description_html,
              clients: prof.clients || [],
              photo_url: prof.photo_url || null,
              status: prof.status || 'approved',
              experience: prof.experience || null,
            }),
          });
          if (!res.ok) {
            const t = await res.text();
            appendLog(`  ERROR: profile upsert failed for ${prof.slug}: ${t}`);
            throw new Error(`Profile upsert failed for ${prof.slug}`);
          }
        }
      }

      appendLog('DONE: Import completed.');
      alert('Import completed.');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      appendLog(`FATAL: ${msg}`);
      alert('Import failed. See log for details.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Import Knowledge (JSON/XML)</h1>
        <a href="/admin" className="text-sm text-blue-600 hover:underline">← Back to Editor</a>
      </div>

      <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <label className="block text-sm font-medium mb-2">Edit Token (Required)</label>
        <input
          type="password"
          placeholder="Enter your EDIT_TOKEN from .env.local"
          className="border p-2 w-full max-w-lg rounded"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
      </div>

      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">Paste JSON or XML</label>
        <textarea
          className="w-full min-h-[280px] border rounded p-2 font-mono text-sm"
          placeholder={'{ "version": "1.0", "articles": [ ... ] }'}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
        />
        <div className="flex items-center gap-3 mt-2 text-sm">
          <span>Detected: <code className="bg-gray-100 px-1 rounded">{detected.toUpperCase()}</code></span>
          <label className="flex items-center gap-1">
            <span className="text-xs uppercase tracking-wide text-gray-500 mr-1">Mode</span>
            <select
              className="border rounded px-2 py-1 text-sm"
              value={mode}
              onChange={(e) => setMode(e.target.value as 'articles' | 'profiles')}
            >
              <option value="articles">Knowledge (Policies)</option>
              <option value="profiles">Profiles</option>
            </select>
          </label>
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name="fmt"
              checked={format === 'json'}
              onChange={() => setFormat('json')}
            />
            JSON
          </label>
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name="fmt"
              checked={format === 'xml'}
              onChange={() => setFormat('xml')}
            />
            XML
          </label>
          <button
            className="ml-auto px-3 py-1.5 bg-gray-800 text-white rounded hover:bg-black"
            onClick={handleValidate}
            disabled={!raw}
          >
            Validate
          </button>
          <button
            className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleImport}
            disabled={!parsed || !token || busy}
          >
            {busy ? 'Importing…' : 'Import'}
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <div className="text-sm font-medium mb-1">Validation / Preview</div>
          <pre className="min-h-[160px] border rounded p-2 bg-gray-50 text-xs whitespace-pre-wrap">{preview}</pre>
        </div>
        <div>
          <div className="text-sm font-medium mb-1">Import Log</div>
          <pre className="min-h-[160px] border rounded p-2 bg-gray-50 text-xs whitespace-pre-wrap">{log}</pre>
        </div>
      </div>

      <div className="mt-6 text-xs text-gray-600">
        <p>Notes:</p>
        <ul className="list-disc ml-5">
          <li>Upsert semantics: existing slugs are updated; new slugs are created.</li>
          <li>If an article includes assets with the src value <code>assets://filename</code>, they will be uploaded via /api/upload and rewritten to permanent URLs before saving.</li>
          <li>Embeddings are generated asynchronously after upsert when OPENAI_API_KEY is configured.</li>
          <li>Ensure parent_slug points to an existing or in-payload slug when building hierarchies.</li>
        </ul>
      </div>
    </main>
  );
}
