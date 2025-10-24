# Knowledge Base Import Specification (JSON/XML)

This document defines the canonical structure for importing articles into the Knowledge Base via the Admin Import tool (`/admin/import`). It is designed for AI pipelines that convert PowerPoint (or other sources) into structured content.

Use JSON as the preferred format. XML is also supported and maps 1:1 to the JSON model.

--------------------------------------------------------------------------------

Overview

- A single import payload can create or update multiple articles in one request.
- Each article becomes a row in the `policies` table and triggers embeddings generation after upsert.
- Parent/child relationships are formed by referencing `parent_slug`.
- If a slug already exists, it will be updated (upsert semantics).

--------------------------------------------------------------------------------

JSON Format (Canonical)

Top-level object:

{
  "version": "1.0",
  "source": "pptx-to-kb (AI name/version here)",
  "articles": [ Article, ... ]
}

Article object schema:

- slug: string (required)
  - Lowercase kebab-case: [a-z0-9]+(-[a-z0-9]+)*
  - Must be unique across the KB
- title: string (required)
- summary: string (optional, recommended)
  - 1–3 sentence plain-text summary
- body_html: string (required)
  - Self-contained HTML snippet (see HTML Rules)
  - Start headings at H2 (H1 is reserved for page title)
- parent_slug: string | null (optional)
  - Slug of parent page, or null for top-level
  - Parent must exist in payload or DB
- audience: string[] (optional; default ["All"])
- status: "approved" | "draft" (optional; default "approved")
- box_folder_id: string | null (optional; numeric string)
- box_file_ids: string[] | null (optional; each numeric string)
- assets: Asset[] (optional; for embedded binary files)

Asset object:

- filename: string
- mime_type: string (e.g., "image/png", "image/jpeg")
- data_base64: string (base64 without data: prefix; no line breaks)
- alt: string (optional)

--------------------------------------------------------------------------------

HTML Rules for body_html

Allowed tags:
- Headings: h2, h3, h4
- Text: p, strong, em, br, blockquote, code, pre
- Lists: ul, ol, li
- Tables: table, thead, tbody, tr, th, td
- Links/Images: a, img

Disallowed:
- script, style, iframe, embed, object, inline styles

Links:
- Use absolute HTTPS URLs: <a href="https://…">text</a>

Images:
- Use <img src="https://…/image.png" alt="Description" />
- If embedding assets in the payload, reference them as:
  <img src="assets://filename" alt="…">
  The importer will upload and rewrite to a permanent URL.

Headings:
- Start at <h2> for major sections (H1 is the page title)
- Use <h3>/<h4> for subsections

Lists:
- Convert bullet/numbered lists to semantic <ul>/<ol>/<li>

Tables:
- Use <table> with semantic <thead> and <tbody> when applicable

--------------------------------------------------------------------------------

Guidance for AI (PPTX → Articles)

- One deck can produce multiple articles:
  - Title slide → parent article: title and summary
  - Major sections → child articles with `parent_slug` set to the parent
- Single-article decks → one article (no `parent_slug`)
- Convert:
  - Slide text → paragraphs
  - Bullets → `<ul>/<li>`
  - Numbered lists → `<ol>/<li>`
  - Tables → semantic `<table>`
- Speaker notes:
  - Either append as paragraphs (if appropriate) or omit; do not mix with main bullets unless specified
- Images:
  - Prefer stable HTTPS URLs in body_html
  - Or embed as assets (see Assets section) and reference via `assets://filename`

--------------------------------------------------------------------------------

Validation Rules Summary

- slug: required, lowercase-kebab-case, unique
- title: required
- body_html: required, valid per HTML Rules
- parent_slug: must exist in payload/DB if provided
- box_folder_id / box_file_ids: numeric strings only
- assets:
  - filename, mime_type, data_base64 required per asset
  - `data_base64` must be base64 (no line breaks)

--------------------------------------------------------------------------------

JSON Examples

Single parent page with two children:

{
  "version": "1.0",
  "source": "pptx-to-kb v0.3",
  "articles": [
    {
      "slug": "business-structure",
      "title": "Business Structure",
      "summary": "Overview of the company’s divisions and reporting lines.",
      "body_html": "<h2>Overview</h2><p>This page outlines our divisions...</p><h2>Org Principles</h2><ul><li>Customer first</li><li>Lean delivery</li></ul>",
      "parent_slug": null,
      "audience": ["All"],
      "status": "approved",
      "box_folder_id": "347360956244",
      "box_file_ids": null
    },
    {
      "slug": "business-structure-sales",
      "title": "Sales Division",
      "summary": "Mandate and structure of Sales.",
      "body_html": "<h2>Mandate</h2><p>Sales drives revenue through...</p><h2>Teams</h2><ul><li>Enterprise</li><li>SMB</li></ul>",
      "parent_slug": "business-structure",
      "audience": ["All"],
      "status": "approved"
    },
    {
      "slug": "business-structure-ops",
      "title": "Operations Division",
      "summary": "Operations teams and key processes.",
      "body_html": "<h2>Functions</h2><p>Ops supports delivery with...</p><h3>Process</h3><ol><li>Intake</li><li>Fulfillment</li></ol>",
      "parent_slug": "business-structure"
    }
  ]
}

Example with embedded assets:

{
  "version": "1.0",
  "source": "pptx-to-kb v0.3",
  "articles": [
    {
      "slug": "security-basics",
      "title": "Security Basics",
      "summary": "Foundational security principles.",
      "body_html": "<h2>Principles</h2><p>Least privilege...</p><p><img src=\"assets://badge.png\" alt=\"Security Badge\"/></p>",
      "parent_slug": null,
      "assets": [
        {
          "filename": "badge.png",
          "mime_type": "image/png",
          "data_base64": "iVBORw0KGgoAAAANSUhEUgAA..."
        }
      ]
    }
  ]
}

--------------------------------------------------------------------------------

XML Format (Mirrors JSON)

<kb version="1.0" source="pptx-to-kb v0.3">
  <articles>
    <article>
      <slug>business-structure</slug>
      <title>Business Structure</title>
      <summary>Overview of the company’s divisions and reporting lines.</summary>
      <body_html><![CDATA[
        <h2>Overview</h2><p>This page outlines our divisions...</p>
        <h2>Org Principles</h2><ul><li>Customer first</li><li>Lean delivery</li></ul>
      ]]></body_html>
      <parent_slug></parent_slug>
      <audience>
        <value>All</value>
      </audience>
      <status>approved</status>
      <box_folder_id>347360956244</box_folder_id>
    </article>
    <article>
      <slug>business-structure-sales</slug>
      <title>Sales Division</title>
      <summary>Mandate and structure of Sales.</summary>
      <body_html><![CDATA[
        <h2>Mandate</h2><p>Sales drives revenue through...</p>
        <h2>Teams</h2><ul><li>Enterprise</li><li>SMB</li></ul>
      ]]></body_html>
      <parent_slug>business-structure</parent_slug>
      <status>approved</status>
    </article>
  </articles>
</kb>

--------------------------------------------------------------------------------

Prompt Template (give this to your AI)

Convert the following PowerPoint into a multi-page Knowledge Base in JSON that conforms exactly to this schema:

- Top-level keys: version (string), source (string), articles (array).
- Each article must include: slug (lowercase-kebab-case), title, summary (optional), body_html (HTML; allowed tags: h2–h4, p, ul, ol, li, table, thead, tbody, tr, th, td, a, img, blockquote, code, pre, strong, em, br; no inline styles or scripts), parent_slug (optional), audience (optional, default ["All"]), status (optional, default "approved"), box_folder_id (optional, numeric string), box_file_ids (optional array of numeric strings).
- Start headings inside body_html at <h2>.
- Use absolute https links for <a href> and <img src>. If embedding image binaries, also produce an 'assets' array per article with filename, mime_type, data_base64 (no line breaks) and reference images as <img src="assets://filename" ...> in body_html.
- Map: Title slide → parent page; major sections → child pages (set parent_slug).
- Keep slug uniqueness; reuse existing slugs when updating (if known).
- Output strictly valid, minified JSON. Do not include comments.

For XML, produce the same fields inside <kb>…</kb> with <articles>/<article> and wrap body_html in CDATA.

--------------------------------------------------------------------------------

Operational Notes

- Import via /admin/import:
  - Paste JSON/XML, Validate, then Import.
  - Embedded assets referenced as `assets://filename` will be uploaded and rewritten to permanent URLs automatically.
  - Embeddings are generated asynchronously after upsert when OPENAI_API_KEY is configured.
- Parent-child linking:
  - Ensure `parent_slug` references an existing or in-payload slug to build tree navigation correctly.
- Upsert semantics:
  - Existing slugs update; new slugs create.
