// Utility to transform shortcodes and plain links into inline, responsive embeds
// Supported patterns:
// - {{youtube:VIDEO_ID}}
// - {{vimeo:VIDEO_ID}}
// - {{video:URL}} for direct MP4/WEBM sources
// - {{file:URL|TYPE}} for documents (PDF, PPTX, etc.)
// Additionally converts bare links matching YouTube/Vimeo/MP4 to embeds when they appear as standalone paragraphs

function escapeHtmlAttr(s: string): string {
  return s
    .replace(/&/g, '&')
    .replace(/"/g, '"')
    .replace(/</g, '<')
    .replace(/>/g, '>');
}

function decodeHtmlEntities(s: string): string {
  // Decode common HTML entities in a single pass (order matters)
  return s
    .replace(/"/g, '"')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/&/g, '&');
}

function wrapIframe(src: string, title: string): string {
  const safeSrc = escapeHtmlAttr(src);
  const safeTitle = escapeHtmlAttr(title);
  return `
<div class="not-prose my-6" style="position:relative;aspect-ratio:16/9;width:100%">
  <iframe
    src="${safeSrc}"
    title="${safeTitle}"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    allowfullscreen
    referrerpolicy="strict-origin-when-cross-origin"
    style="position:absolute;inset:0;width:100%;height:100%;border:0"
  ></iframe>
</div>`;
}

function wrapVideo(src: string): string {
  const safeSrc = escapeHtmlAttr(src);
  return `
<div class="not-prose my-6" style="position:relative;aspect-ratio:16/9;width:100%">
  <video src="${safeSrc}" controls playsinline preload="metadata" style="position:absolute;inset:0;width:100%;height:100%;background:black;border-radius:8px"></video>
</div>`;
}

function youtubeIdFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) {
      const id = u.pathname.split('/').filter(Boolean)[0];
      return id || null;
    }
    if (u.hostname.includes('youtube.com')) {
      if (u.pathname.startsWith('/watch')) return u.searchParams.get('v');
      if (u.pathname.startsWith('/embed/')) return u.pathname.split('/')[2] || null;
      if (u.pathname.startsWith('/shorts/')) return u.pathname.split('/')[2] || null;
    }
    return null;
  } catch {
    return null;
  }
}

function vimeoIdFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes('vimeo.com')) {
      const parts = u.pathname.split('/').filter(Boolean);
      const id = parts[0];
      return id && /^\d+$/.test(id) ? id : null;
    }
    return null;
  } catch {
    return null;
  }
}

function isDirectVideo(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    const path = u.pathname.toLowerCase();
    return path.endsWith('.mp4') || path.endsWith('.webm') || path.endsWith('.ogg');
  } catch {
    return false;
  }
}

function renderFileEmbed(url: string, type: string): string {
  const safeUrl = escapeHtmlAttr(url);
  const lowerType = type.toLowerCase();

  // PDF: use browser native viewer
  if (lowerType === 'pdf') {
    return `
<div class="not-prose my-6">
  <iframe
    src="${safeUrl}"
    width="100%"
    height="600"
    style="border:1px solid #e5e7eb;border-radius:8px"
    title="PDF document"
  ></iframe>
</div>`;
  }

  // PowerPoint: use Microsoft Office Online viewer
  if (lowerType === 'pptx' || lowerType === 'ppt') {
    const officeUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
    return `
<div class="not-prose my-6" style="position:relative;aspect-ratio:16/9;width:100%">
  <iframe
    src="${escapeHtmlAttr(officeUrl)}"
    style="position:absolute;inset:0;width:100%;height:100%;border:1px solid #e5e7eb;border-radius:8px"
    frameborder="0"
    title="PowerPoint presentation"
  ></iframe>
</div>`;
  }

  // Word/Excel: also use Microsoft Office Online viewer
  if (lowerType === 'docx' || lowerType === 'doc' || lowerType === 'xlsx' || lowerType === 'xls') {
    const officeUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
    return `
<div class="not-prose my-6" style="position:relative;aspect-ratio:4/3;width:100%">
  <iframe
    src="${escapeHtmlAttr(officeUrl)}"
    style="position:absolute;inset:0;width:100%;height:100%;border:1px solid #e5e7eb;border-radius:8px"
    frameborder="0"
    title="Office document"
  ></iframe>
</div>`;
  }

  // Fallback: styled download link
  const filename = url.split('/').pop()?.split('?')[0] || 'Download file';
  return `
<div class="not-prose my-4 p-4 bg-gray-50 rounded-lg border border-gray-200 inline-flex items-center gap-3">
  <svg class="w-6 h-6 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
  </svg>
  <a href="${safeUrl}" download class="text-[#667eea] hover:underline font-medium">${escapeHtmlAttr(filename)}</a>
</div>`;
}

export function renderEmbeds(html: string): string {
  if (!html) return html;
  let out = html;

  // Basic sanitation: strip dangerous tags that might have slipped in
  out = out
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<(?:embed|object)\b[^<]*(?:(?!<\/(?:embed|object)>)<[^<]*)*<\/(?:embed|object)>/gi, '')
    .replace(/<(?:iframe|embed|object)[^>]*\/>/gi, '');

  // Shortcodes first (only when they occupy a whole paragraph)
  out = out.replace(/<p>\s*\{\{\s*youtube\s*:\s*([A-Za-z0-9_-]{6,})\s*\}\}\s*<\/p>/g, (_m, id: string) => {
    const src = `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`;
    return wrapIframe(src, 'YouTube video');
  });

  out = out.replace(/<p>\s*\{\{\s*vimeo\s*:\s*(\d+)\s*\}\}\s*<\/p>/g, (_m, id: string) => {
    const src = `https://player.vimeo.com/video/${id}`;
    return wrapIframe(src, 'Vimeo video');
  });

  out = out.replace(/<p>\s*\{\{\s*video\s*:\s*([^}]+)\}\}\s*<\/p>/g, (_m, url: string) => {
    const trimmed = url.trim();
    if (!isDirectVideo(trimmed)) return _m; // leave untouched if not recognized
    return wrapVideo(trimmed);
  });

  // Fallback: replace bare shortcodes anywhere (in case legacy content exists)
  out = out.replace(/\{\{\s*youtube\s*:\s*([A-Za-z0-9_-]{6,})\s*\}\}/g, (_m, id: string) => {
    const src = `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`;
    return wrapIframe(src, 'YouTube video');
  });
  out = out.replace(/\{\{\s*vimeo\s*:\s*(\d+)\s*\}\}/g, (_m, id: string) => {
    const src = `https://player.vimeo.com/video/${id}`;
    return wrapIframe(src, 'Vimeo video');
  });
  out = out.replace(/\{\{\s*video\s*:\s*([^}]+)\}\}/g, (_m, url: string) => {
    const trimmed = url.trim();
    if (!isDirectVideo(trimmed)) return _m;
    return wrapVideo(trimmed);
  });

  // File shortcodes: {{file:URL|TYPE}}
  // In paragraph context first
  out = out.replace(/<p>\s*\{\{\s*file\s*:\s*([^|]+)\|(\w+)\s*\}\}\s*<\/p>/g, (_m, url: string, type: string) => {
    return renderFileEmbed(url.trim(), type.trim());
  });

  // Fallback: bare file shortcodes anywhere
  out = out.replace(/\{\{\s*file\s*:\s*([^|]+)\|(\w+)\s*\}\}/g, (_m, url: string, type: string) => {
    return renderFileEmbed(url.trim(), type.trim());
  });

  // Standalone links in their own paragraph -> embed
  // Matches <p><a href="...">(same url)</a></p>
  out = out.replace(/<p>\s*<a[^>]*href=\"([^\"]+)\"[^>]*>\s*\1\s*<\/a>\s*<\/p>/g, (_m, url: string) => {
    const raw = decodeHtmlEntities(url);
    const yid = youtubeIdFromUrl(raw);
    if (yid) return wrapIframe(`https://www.youtube.com/embed/${yid}?rel=0&modestbranding=1`, 'YouTube video');
    const vid = vimeoIdFromUrl(raw);
    if (vid) return wrapIframe(`https://player.vimeo.com/video/${vid}`, 'Vimeo video');
    if (isDirectVideo(raw)) return wrapVideo(raw);
    return _m;
  });

  return out;
}
