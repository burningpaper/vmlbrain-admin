# CMS Setup Guide

This guide will help you set up your Tiptap-based CMS for authoring policy documents with rich text, images, and links.

## Prerequisites

- Node.js 18+ installed
- A Supabase account and project created
- Basic knowledge of Next.js

## 1. Supabase Database Setup

### Create the Policies Table

Run this SQL in your Supabase SQL Editor:

```sql
CREATE TABLE policies (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  body_md TEXT,
  parent_slug TEXT,
  audience TEXT[] DEFAULT ARRAY['All'],
  status TEXT DEFAULT 'approved',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (parent_slug) REFERENCES policies(slug) ON DELETE SET NULL
);

-- Enable Row Level Security
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access"
  ON policies
  FOR SELECT
  TO public
  USING (status = 'approved');

-- Allow service role full access
CREATE POLICY "Allow service role full access"
  ON policies
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

### Create Storage Bucket for Images

1. Go to **Storage** in your Supabase dashboard
2. Click **New bucket**
3. Name it: `policy-assets`
4. Make it **Public** (so images can be viewed)
5. Click **Create bucket**

### Configure Storage Policies

In the Storage policies section, add this policy:

```sql
-- Allow public read access to policy-assets
CREATE POLICY "Public Access"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'policy-assets');

-- Allow service role to upload
CREATE POLICY "Service Role Upload"
  ON storage.objects
  FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'policy-assets');
```

## 2. Environment Variables

Create a `.env.local` file in your project root:

```env
# Get these from your Supabase project settings -> API
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Get this from Supabase project settings -> API -> service_role key
SUPABASE_SERVICE_ROLE=your-service-role-key-here

# Create a secure random token for editing (e.g., use: openssl rand -hex 32)
EDIT_TOKEN=your-secure-edit-token-here
```

### How to Generate a Secure Edit Token

Run this command in your terminal:
```bash
openssl rand -hex 32
```

Copy the output and use it as your `EDIT_TOKEN`.

## 3. Install Dependencies

```bash
npm install
```

## 4. Run the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## 5. Using the CMS

### Access the Admin Interface

Navigate to: `http://localhost:3000/admin`

### First Time Setup

1. **Enter your Edit Token**: Paste the `EDIT_TOKEN` value from your `.env.local` file into the token field
2. **Create a new policy**: Click the "+ New" button
3. **Fill in the details**:
   - **Slug**: URL-friendly identifier (e.g., `privacy-policy`, `code-of-conduct`)
   - **Title**: Human-readable title
   - **Summary**: Brief description (optional)
   - **Body**: Use the rich text editor

### Editor Features

The PolicyEditor component includes:

- **Text Formatting**: Bold (B), Italic (I), Strikethrough (S)
- **Headings**: H1, H2, H3
- **Lists**: Bullet lists and numbered lists
- **Links**: Click the 🔗 button and enter a URL
- **Images**: 
  - Click the 🖼️ button to upload from your computer
  - Paste images directly from clipboard (Ctrl+V / Cmd+V)
  - Drag and drop images into the editor
- **Tables**: Insert tables with the ⊞ button
- **Undo/Redo**: Navigate your editing history

### Saving Content

1. Click the **Save** button
2. If successful, you'll see an alert "Saved"
3. The policy is now stored in your Supabase database

### Editing Existing Policies

1. Click on any policy title in the sidebar
2. The editor will load that policy's content
3. Make your changes
4. Click **Save** to update

## 6. Viewing Published Policies

Policies can be viewed at: `http://localhost:3000/p/{slug}`

For example: `http://localhost:3000/p/privacy-policy`

## 7. Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import the repository in Vercel
3. Add the environment variables in Vercel project settings
4. Deploy

### Important: Security Considerations

- **Never commit** your `.env.local` file to version control
- Keep your `EDIT_TOKEN` secure - this protects your admin interface
- The `SUPABASE_SERVICE_ROLE` key has elevated permissions - keep it secret
- Consider adding authentication for production use

## 8. Customization

### Styling the Viewer

Edit `src/app/p/[slug]/page.tsx` to customize how policies are displayed to end users.

### Adding More Editor Features

To add more Tiptap extensions:

1. Install the extension: `npm install @tiptap/extension-name`
2. Import it in `src/components/PolicyEditor.tsx`
3. Add it to the `extensions` array
4. Add toolbar buttons as needed

### Database Schema

You can modify the `policies` table to add more fields (e.g., `author`, `category`, `tags`) based on your needs.

## Troubleshooting

### Images Won't Upload

- Verify the `policy-images` bucket exists and is public
- Check that storage policies are configured correctly
- Ensure `SUPABASE_SERVICE_ROLE` is set correctly

### Can't Save Policies

- Verify your `EDIT_TOKEN` matches between `.env.local` and the admin interface
- Check browser console for errors
- Verify table policies allow service role access

### Policies Don't Appear

- Check that policies have `status = 'approved'`
- Verify RLS policies are configured correctly
- Check browser console for errors

## Support

For issues with:
- **Tiptap**: Visit [tiptap.dev](https://tiptap.dev)
- **Supabase**: Visit [supabase.com/docs](https://supabase.com/docs)
- **Next.js**: Visit [nextjs.org/docs](https://nextjs.org/docs)
