# VMLBrain Admin - Project Documentation

> **Built with**: Gemini Pro
> **Maintained by**: VML Team
> **Purpose**: Enterprise intranet and knowledge base platform

---

## 🏗️ Project Overview

**VMLBrain Admin** is a comprehensive company intranet platform built for VML (marketing/advertising agency). This is NOT a simple CMS - it's a full-featured enterprise knowledge management system with AI capabilities, people directory, file management, and advanced content organization.

### Tech Stack
- **Framework**: Next.js 15.5.5 (App Router, Server Components, Turbopack)
- **Database**: Supabase (PostgreSQL + pgvector for vector search)
- **Rich Text**: Tiptap editor with full formatting capabilities
- **AI**: OpenAI (text-embedding-ada-002 + GPT-4o-mini for RAG)
- **File Storage**: Box.com integration + Supabase Storage
- **Styling**: Tailwind CSS 4.x
- **Language**: TypeScript

---

## 📚 Core Features

### 1. Knowledge Base / CMS
**Primary Files**: `src/app/admin/page.tsx`, `src/components/PolicyEditor.tsx`, `src/app/p/[[...slug]]/page.tsx`

- **Hierarchical content**: Parent/child page relationships with breadcrumb navigation
- **Section-based organization**: Homepage categorization via sections table
- **Rich text editing** (Tiptap):
  - Text formatting (bold, italic, strikethrough)
  - Headings (H1-H6)
  - Lists (bullet, numbered)
  - Links with auto-link detection
  - Images (paste/drag-drop/upload)
  - Videos (YouTube, Vimeo, MP4 with shortcode support)
  - Tables with bubble menu for manipulation
  - Undo/redo history
- **Slug-based routing**: `/p/parent/child/grandchild` with dynamic path resolution
- **Auto TOC**: Automatically generates "In this section" for parent pages

### 2. People Directory
**Primary Files**: `src/app/people/page.tsx`, `src/app/people/[slug]/page.tsx`

- Employee profile pages with rich metadata
- Fields: first_name, last_name, job_title, email, photo_url
- Client portfolio tracking (array field)
- Work experience history
- Rich text profile descriptions
- Grid layout on homepage + dedicated directory
- Photo upload via admin panel

### 3. AI-Powered RAG Chatbot
**Primary Files**: `src/app/api/chat/route.ts`, `src/components/ChatWidget.tsx`, `CHATBOT-README.md`

- **Vector similarity search** using OpenAI embeddings (1536 dimensions)
- **Supabase pgvector** for efficient semantic search
- **GPT-4o-mini** for answer generation
- **Floating chat widget** on all pages
- **Source citations** linking back to relevant policies
- **Auto-generates embeddings** when content is saved/updated
- **Cost**: ~$0.0005 per conversation (very economical)
- **Search function**: `match_policy_embeddings()` with configurable threshold (default: 0.7)

### 4. Box.com Integration
**Primary Files**: `src/components/BoxExplorer.tsx`, `src/app/api/box/token/route.ts`, `BOX-INTEGRATION.sql`

- Link Box folders/files to knowledge articles
- Read-only file tree browser component
- File preview support
- Related files sidebar on article pages
- Token-based authentication with Box API

### 5. Content Management (Admin)
**Primary File**: `src/app/admin/page.tsx`

- **Token-based auth**: EDIT_TOKEN required for all save operations
- **Unified editor**: Single interface for articles and profiles
- **Tree view sidebar**: Hierarchical navigation with expand/collapse
- **Section assignment**: Organize content for homepage display
- **Parent page selector**: Create nested content structures
- **Box linking**: Attach folders/files to articles
- **Delete functionality**: With confirmation dialogs
- **Import system**: JSON/XML bulk import (`src/app/admin/import/page.tsx`)

---

## 🗄️ Database Schema

### `policies` Table
```sql
slug TEXT UNIQUE NOT NULL,           -- URL-friendly identifier
title TEXT NOT NULL,                 -- Display title
summary TEXT,                        -- Brief description
body_md TEXT,                        -- HTML content from Tiptap
parent_slug TEXT,                    -- For hierarchical structure
section_key TEXT,                    -- Homepage section grouping
box_folder_id TEXT,                  -- Box folder for related files
box_file_ids TEXT[],                 -- Specific Box files
audience TEXT[] DEFAULT ['All'],     -- Target audience
status TEXT DEFAULT 'approved',      -- Publication status
created_at TIMESTAMPTZ,
updated_at TIMESTAMPTZ
```

### `sections` Table
```sql
key TEXT PRIMARY KEY,                -- Unique identifier
name TEXT NOT NULL,                  -- Display name
icon TEXT,                           -- Icon identifier
image_name TEXT,                     -- Header image filename
sort_order INT                       -- Display order on homepage
```

### `profiles` Table
```sql
slug TEXT UNIQUE NOT NULL,
first_name TEXT NOT NULL,
last_name TEXT NOT NULL,
job_title TEXT NOT NULL,
email TEXT,
clients TEXT[],                      -- Main clients serviced
photo_url TEXT,
description_html TEXT,               -- Rich text profile
experience TEXT,                     -- Work history
status TEXT DEFAULT 'approved'
```

### `policy_embeddings` Table (AI)
```sql
id BIGSERIAL PRIMARY KEY,
policy_id BIGINT REFERENCES policies(id),
policy_slug TEXT NOT NULL,
chunk_index INT NOT NULL,            -- Position in document
content TEXT NOT NULL,               -- ~1000 char chunk
embedding vector(1536),              -- OpenAI embedding
created_at TIMESTAMPTZ
```

---

## 📁 Key Files & Components

### Pages (App Router)
- `src/app/page.tsx` - Homepage with sections, latest updates, people grid
- `src/app/admin/page.tsx` - Admin CMS interface (token-gated)
- `src/app/admin/import/page.tsx` - JSON/XML bulk import tool
- `src/app/p/[[...slug]]/page.tsx` - Dynamic policy viewer with breadcrumbs
- `src/app/people/page.tsx` - People directory listing
- `src/app/people/[slug]/page.tsx` - Individual profile pages
- `src/app/files/page.tsx` - Box resources browser

### Components
- `src/components/PolicyEditor.tsx` - Tiptap rich text editor with toolbar
- `src/components/ChatWidget.tsx` - Floating AI chat interface
- `src/components/BoxExplorer.tsx` - Box.com file browser
- `src/components/SidebarNav.tsx` - Policy tree navigation
- `src/components/FeatureCard.tsx` - Homepage section cards
- `src/components/FlyingBird.tsx` - Easter egg animation 🐦

### API Routes
- `src/app/api/policies/upsert/route.ts` - Save/update articles (token-gated)
- `src/app/api/policies/delete/route.ts` - Delete articles (token-gated)
- `src/app/api/profiles/upsert/route.ts` - Save/update profiles (token-gated)
- `src/app/api/profiles/delete/route.ts` - Delete profiles (token-gated)
- `src/app/api/upload/route.ts` - Image/video upload to Supabase Storage
- `src/app/api/chat/route.ts` - AI chatbot endpoint (public)
- `src/app/api/embeddings/generate/route.ts` - Generate embeddings (token-gated)
- `src/app/api/embeddings/generate-profile/route.ts` - Profile embeddings
- `src/app/api/box/token/route.ts` - Box authentication
- `src/app/api/auth/callback/route.ts` - SSO callback handler
- `src/app/api/keepalive/route.ts` - Health check endpoint

### Library Files
- `src/lib/supabase.ts` - Client-side Supabase client
- `src/lib/supabaseAdmin.ts` - Server-side admin client (service role)
- `src/lib/renderEmbeds.ts` - Video shortcode parser ({{youtube:ID}}, {{vimeo:ID}})
- `src/types.ts` - TypeScript type definitions

### Configuration
- `next.config.ts` - Next.js configuration
- `tailwind.config.js` - Tailwind CSS customization
- `tsconfig.json` - TypeScript compiler options
- `.env.local.example` - Environment variable template

---

## 🔐 Security & Authentication

### Current Implementation
- **Token-based admin auth**: Single `EDIT_TOKEN` in environment variables
- **Supabase RLS**: Row Level Security policies on all tables
- **Service role**: Server-side operations use elevated permissions
- **Public read**: Approved content accessible to all
- **SSO infrastructure**: SSL certificates present, middleware.ts has auth hooks

### Environment Variables
```bash
NEXT_PUBLIC_SUPABASE_URL=          # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # Public anon key
SUPABASE_SERVICE_ROLE=              # Admin service role key
EDIT_TOKEN=                         # Admin panel password
OPENAI_API_KEY=                     # For embeddings & chat
NEXT_PUBLIC_SITE_URL=               # For embedding generation
BOX_CLIENT_ID=                      # Box.com integration
BOX_CLIENT_SECRET=                  # Box.com integration
BOX_ENTERPRISE_ID=                  # Box.com integration
```

### Security Considerations
- ⚠️ Single edit token shared by all admins (no role-based access)
- ⚠️ No rate limiting on AI chat endpoint
- ⚠️ No CSRF protection on admin forms
- ✅ RLS policies prevent unauthorized data access
- ✅ Service role key only used server-side
- ✅ Images/videos uploaded to Supabase Storage with policies

---

## 🎨 Design System

### Brand Identity (VML)
- **Logo**: Snowflake/X design (see `public/BLACK Logo Snowflake-VML.png`)
- **Primary Gradient**: `#667eea` → `#764ba2` (purple)
- **Secondary Gradient**: `#f093fb` → `#f5576c` (pink, for profiles)

### Color Palette
```css
--primary: #667eea
--primary-dark: #764ba2
--text-primary: #1a1a1a
--text-secondary: #4a4a4a
--text-muted: #666
--text-light: #999
--border: #e5e7eb
--background: #ffffff
--background-subtle: #f9fafb
```

### Layout
- **Max width**: 1400px
- **Content width**: 1200px (hero sections)
- **Spacing**: 8px base unit (Tailwind default)
- **Border radius**: 0.75rem (rounded-xl) for cards

### Typography
- **Headings**: Extrabold (font-weight: 800), tight tracking
- **Body**: Regular (font-weight: 400), relaxed leading
- **Labels**: Semibold (font-weight: 600)
- **Code**: Monospace with gray background

---

## 🔧 Common Development Tasks

### Adding a New Section to Homepage
1. Insert into `sections` table in Supabase:
   ```sql
   INSERT INTO sections (key, name, icon, image_name, sort_order)
   VALUES ('new-section', 'New Section', 'book', 'homepage_image.jpg', 50);
   ```
2. Assign articles to section via admin panel (section_key field)
3. Section automatically appears on homepage in sort order

### Creating a New API Route
1. Create file: `src/app/api/[name]/route.ts`
2. Export POST/GET handlers:
   ```typescript
   export async function POST(req: Request) {
     const token = req.headers.get('x-edit-token');
     if (token !== process.env.EDIT_TOKEN) {
       return new Response('Unauthorized', { status: 401 });
     }
     // Your logic here
   }
   ```
3. Use `supaAdmin` from `src/lib/supabaseAdmin.ts` for database operations

### Adding a New Tiptap Extension
1. Install: `npm install @tiptap/extension-[name]`
2. Import in `src/components/PolicyEditor.tsx`
3. Add to extensions array in `useEditor()`
4. Add toolbar button if needed
5. Update prose classes for styling

### Regenerating All Embeddings
```bash
npm run dev  # Start server first
npx tsx scripts/generate-all-embeddings.ts
```

### Deploying to Production
1. Push code to GitHub
2. Import repo in Vercel
3. Add environment variables in Vercel settings
4. Deploy
5. Update `NEXT_PUBLIC_SITE_URL` to production domain
6. Regenerate embeddings with production URL

---

## 🐛 Known Issues & Technical Debt

### Code Quality
- **Duplicate Supabase clients**: Multiple files define supabase clients (`src/supabase.ts`, `src/lib/supabase.ts`, `src/app/lib/supabase.ts`)
- **Type safety**: Some `any` types in data fetching (see `src/app/page.tsx:12`)
- **Error handling**: API routes could use more robust error responses

### Performance
- **No caching**: `revalidate: 0` on policy pages - could use ISR
- **Sequential queries**: Some pages fetch data sequentially (though Promise.all is used)
- **No image optimization**: Uploaded images aren't resized/compressed

### Features
- **No search**: Homepage lacks traditional search (only AI chat)
- **No versioning**: No content history or revisions
- **No drafts**: Content is either approved or not (no preview mode)
- **Single token**: All admins share one EDIT_TOKEN (no RBAC)

### Security
- **No rate limiting**: AI endpoints could be abused
- **Token visibility**: EDIT_TOKEN visible in client-side code
- **No audit logs**: Can't track who changed what

---

## 📊 Performance Characteristics

### AI Chatbot Costs
- **Embeddings**: $0.0001 per 1K tokens
  - Average policy (1000 words) ≈ $0.00015
  - 100 policies ≈ $0.015 total
- **Chat**: $0.150/1M input + $0.600/1M output tokens
  - Per conversation ≈ $0.0005
  - 1000 conversations/month ≈ $0.50

### Database
- **Vector search**: O(log n) with pgvector index
- **Policies**: Typically <100 records, queries are fast
- **Embeddings**: Chunked at ~1000 chars, avg 5-10 chunks per policy

---

## 🚀 Future Enhancement Ideas

### High Priority
1. **Proper authentication**: Replace token with OAuth/SAML SSO
2. **Role-based access**: Editor, Reviewer, Admin roles
3. **Draft workflow**: Draft → Review → Publish states
4. **Search functionality**: Traditional keyword search + AI chat
5. **Image optimization**: Auto-resize uploads with sharp

### Medium Priority
6. **Content versioning**: Track changes and allow rollback
7. **Audit logging**: Who changed what and when
8. **Rate limiting**: Protect AI endpoints from abuse
9. **Analytics**: Track popular content, search queries
10. **Notifications**: Alert editors when content needs review

### Low Priority
11. **Comment system**: Allow feedback on articles
12. **Bookmarking**: Users can save favorite articles
13. **Multi-language**: i18n support for global teams
14. **Dark mode**: Theme toggle
15. **Email notifications**: New content alerts

---

## 📚 Reference Documentation

- `README.md` - Basic Next.js setup instructions
- `SETUP.md` - Initial Supabase and environment setup
- `HOW-TO-USE.md` - User guide for the CMS
- `CHATBOT-README.md` - AI chatbot setup and architecture
- `CHATBOT-SETUP.sql` - Database schema for embeddings
- `BOX-INTEGRATION.sql` - Box.com integration setup
- `PROFILES-SETUP.sql` - People directory schema
- `SECTIONS-SETUP.sql` - Homepage sections schema
- `KB-IMPORT-SPEC.md` - Bulk import specification

---

## 🎯 Quick Reference

### Development
```bash
npm run dev          # Start dev server (port 3000)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Important URLs
- Homepage: `http://localhost:3000`
- Admin: `http://localhost:3000/admin`
- People: `http://localhost:3000/people`
- Resources: `http://localhost:3000/files`
- Policy: `http://localhost:3000/p/{slug}`
- Profile: `http://localhost:3000/people/{slug}`

### Database Access
- Supabase Dashboard: https://app.supabase.com
- Tables: policies, sections, profiles, policy_embeddings
- Storage buckets: policy-assets

---

**Last Updated**: 2026-02-23
**Status**: Production-ready MVP with known enhancement opportunities
