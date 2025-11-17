// Utility to transform simple video shortcodes and plain links into inline, responsive embeds
// Supported patterns:
// - {{youtube:VIDEO_ID}}
// - {{vimeo:VIDEO_ID}}
// - {{video:URL}} for direct MP4/WEBM sources
// Additionally converts bare links matching YouTube/Vimeo/MP4 to embeds when they appear as standalone paragraphs

function escapeHtmlAttr(s: string): string {
  return s
    .replace(/&/g, '&')
    .replace(/"/g, '"')
    .replace(/</g, '<')
    .replace(/>/g, '>');
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
    const path = u.pathname.toLowerCase();
    return path.endsWith('.mp4') || path.endsWith('.webm') || path.endsWith('.ogg');
  } catch {
    return false;
  }
}

export function renderEmbeds(html: string): string {
  if (!html) return html;
  let out = html;

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

  // Standalone links in their own paragraph -> embed
  // Matches <p><a href="...">(same url)</a></p>
  out = out.replace(/<p>\s*<a[^>]*href=\"([^\"]+)\"[^>]*>\s*\1\s*<\/a>\s*<\/p>/g, (_m, url: string) => {
    const yid = youtubeIdFromUrl(url);
    if (yid) return wrapIframe(`https://www.youtube.com/embed/${yid}?rel=0&modestbranding=1`, 'YouTube video');
    const vid = vimeoIdFromUrl(url);
    if (vid) return wrapIframe(`https://player.vimeo.com/video/${vid}`, 'Vimeo video');
    if (isDirectVideo(url)) return wrapVideo(url);
    return _m;
  });

  return out;
}
