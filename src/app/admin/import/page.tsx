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

type ImportPayload = {
  version: string;
  source?: string;
  articles: ImportArticle[];
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
  if (!Array.isArray(obj.articles)) throw new Error('JSON must have "articles" array');
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

  const articlesEl = root.querySelector('articles');
  if (!articlesEl) throw new Error('<kb> must contain <articles>');

  const articles: ImportArticle[] = [];
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

  return { version, source, articles };
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


  const detected = useMemo(() => guessFormat(raw), [raw]);

  function validatePayload(p: ImportPayload) {
    const errors: string[] = [];
    if (!p.articles || !Array.isArray(p.articles) || p.articles.length === 0) {
      errors.push('No articles found.');
      return errors;
    }
    const seen = new Set<string>();
    for (const art of p.articles) {
      if (!art.slug) errors.push('Article missing slug.');
      if (art.slug && !isKebabCaseSlug(art.slug)) errors.push(`Invalid slug: ${art.slug} (must be lowercase-kebab-case)`);
      if (art.slug && seen.has(art.slug)) errors.push(`Duplicate slug in payload: ${art.slug}`);
      if (art.slug) seen.add(art.slug);
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
        const titles = payload.articles.map((a) => `• ${a.slug} — ${a.title}${a.parent_slug ? ` (parent: ${a.parent_slug})` : ''}`).join('\n');
        setPreview(`Parsed ${payload.articles.length} articles:\n${titles}`);
      }
    } catch (e: any) {
      setParsed(null);
      setPreview(`Parse error: ${e?.message || String(e)}`);
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
      // Process in given order (parent/child is fine by slug referencing)
      for (const art of parsed.articles) {
        appendLog(`Processing ${art.slug}...`);

        // Handle assets: upload then rewrite src
        let html = art.body_html;
        const map: Record<string, string> = {};
        if (art.assets && art.assets.length) {
          for (const as of art.assets) {
            appendLog(`  Uploading asset ${as.filename}...`);
            const url = await uploadAsset(token, as);
            map[as.filename] = url;
          }
          html = rewriteAssetsSrc(html, map);
        }

        // Upsert article
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
            body_md: html, // our DB column is body_md but currently stores HTML string
            parent_slug: art.parent_slug || null,
            audience: art.audience || ['All'],
            status: art.status || 'approved',
            box_folder_id: art.box_folder_id || null,
            box_file_ids: art.box_file_ids || null,
          }),
        });

        if (!res.ok) {
          const t = await res.text();
          appendLog(`  ERROR: upsert failed for ${art.slug}: ${t}`);
          throw new Error(`Upsert failed for ${art.slug}`);
        } else {
          appendLog(`  Upserted ${art.slug} (embeddings will generate in background).`);
        }
      }

      appendLog('DONE: All articles imported successfully.');
      alert('Import completed.');
    } catch (e: any) {
      appendLog(`FATAL: ${e?.message || String(e)}`);
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
          <li>If an article includes assets with src="assets://filename", they will be uploaded via /api/upload and rewritten to permanent URLs before saving.</li>
          <li>Embeddings are generated asynchronously after upsert when OPENAI_API_KEY is configured.</li>
          <li>Ensure parent_slug points to an existing or in-payload slug when building hierarchies.</li>
        </ul>
      </div>
    </main>
  );
}
