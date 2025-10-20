# How to Use Your Policy CMS

## Understanding the CMS Structure

This is a **database-driven CMS**, not a file-based system. Content is stored in your Supabase database, not in files or folders.

### How It Works

1. **Content Storage**: All policies are stored in the `policies` table in Supabase
2. **URLs**: Each policy is accessible via its slug at `http://localhost:3000/p/{slug}`
3. **No Directory Structure**: There are no folders or directory trees - policies are flat database records

## Creating New Content

### Step 1: Enter Your Edit Token
1. Open `http://localhost:3000/admin`
2. Copy your `EDIT_TOKEN` from `.env.local` (currently: `ABCEDEFGHIJKL`)
3. Paste it into the password field at the top

### Step 2: Click "+ New Policy"
1. Click the blue "+ New Policy" button in the sidebar
2. The form fields will clear, ready for new content

### Step 3: Fill in the Fields

**Slug** (Required)
- This becomes the URL: `http://localhost:3000/p/YOUR-SLUG-HERE`
- Use lowercase letters and hyphens only
- Examples: `privacy-policy`, `employee-handbook`, `code-of-conduct`

**Title** (Required)
- The display title shown at the top of the page
- Examples: "Privacy Policy", "Employee Handbook", "Code of Conduct"

**Summary** (Optional)
- A brief description that appears under the title
- Examples: "Our commitment to protecting your data"

**Body** (Required)
- The main content using the rich text editor
- Use the toolbar to format text, add images, links, tables, etc.

### Step 4: Save
1. Click the "Save" button at the bottom
2. You should see "Saved" alert
3. The policy is now in your database

### Step 5: View Your Content
Navigate to `http://localhost:3000/p/YOUR-SLUG` to see it live

## Editing Existing Content

1. Open `http://localhost:3000/admin`
2. Enter your edit token
3. Click on any policy name in the sidebar to load it
4. Make your changes
5. Click "Save"

## Content Organization

Since there's no directory tree, you organize content through:

### 1. Naming Convention (Slugs)
Use prefixes to group related content:
- `policy-privacy`
- `policy-terms`
- `policy-cookies`
- `handbook-onboarding`
- `handbook-benefits`
- `guide-remote-work`
- `guide-expenses`

### 2. Categories (Optional - requires database changes)
You could add a `category` field to the database to filter policies by type.

### 3. Tags (Optional - requires database changes)
Add a `tags` array field to enable multiple categorization.

## Example Workflow

### Creating a Privacy Policy

1. Click "+ New Policy"
2. Enter:
   - **Slug**: `privacy-policy`
   - **Title**: `Privacy Policy`
   - **Summary**: `How we collect, use, and protect your personal information`
   - **Body**: Type your policy content, add headings, format text, etc.
3. Click "Save"
4. View at: `http://localhost:3000/p/privacy-policy`

### Creating Multiple Related Policies

For a set of HR policies:

1. **Onboarding Guide**
   - Slug: `hr-onboarding`
   - Title: "New Employee Onboarding"

2. **Leave Policy**
   - Slug: `hr-leave-policy`
   - Title: "Leave and Time Off Policy"

3. **Remote Work**
   - Slug: `hr-remote-work`
   - Title: "Remote Work Guidelines"

All accessible at `http://localhost:3000/p/hr-{policy-name}`

## Rich Text Editor Features

### Text Formatting
- **Bold**: Ctrl+B / Cmd+B or click B button
- **Italic**: Ctrl+I / Cmd+I or click I button
- **Strikethrough**: Click S button

### Headings
- Use H1, H2, H3 buttons for section headers
- Creates hierarchy in your content

### Lists
- Bullet lists for unordered items
- Numbered lists for sequential steps

### Links
1. Select text
2. Click the 🔗 button
3. Enter URL
4. Press OK

### Images
Three ways to add images:

1. **Upload Button**: Click 🖼️ → Choose file
2. **Paste**: Copy image → Ctrl+V / Cmd+V in editor
3. **Drag & Drop**: Drag image file into editor

Images are automatically uploaded to Supabase Storage (`policy-assets` bucket)

### Tables
1. Click ⊞ button
2. A 3x3 table with headers is inserted
3. Click cells to edit content

## Tips & Best Practices

### Slug Naming
- ✅ `employee-handbook`
- ✅ `privacy-policy-2024`
- ❌ `Employee Handbook` (no spaces)
- ❌ `privacy_policy` (use hyphens, not underscores)

### Content Structure
Use headings to organize long documents:
```
# Main Title (H1)
Summary text...

## Section 1 (H2)
Content...

### Subsection 1.1 (H3)
Details...

## Section 2 (H2)
Content...
```

### Images
- Use descriptive filenames before uploading
- Images are automatically stored in Supabase
- All images become publicly accessible URLs

### Saving
- Save frequently while editing
- No auto-save currently implemented
- Refresh browser will lose unsaved changes

## Troubleshooting

### "Missing edit token"
- Make sure you've entered your `EDIT_TOKEN` in the password field
- Token is found in `.env.local` file

### "Save failed"
- Check that your token is correct
- Look at browser console (F12) for error details
- Verify Supabase connection

### New button doesn't work
- The fields should clear when clicked
- The editor should reset to empty
- If not working, refresh the page

### Can't see saved policy
- Policies must have `status = 'approved'` to be visible
- Check the database to verify it was saved
- Navigate to: `http://localhost:3000/p/YOUR-SLUG`

## Database Structure

Your policies are stored with these fields:
- `id`: Auto-generated unique ID
- `slug`: URL-friendly identifier (unique)
- `title`: Display title
- `summary`: Optional description
- `body_md`: HTML content from editor
- `audience`: Array of audience types (default: ['All'])
- `status`: Publication status (default: 'approved')
- `created_at`: Timestamp of creation
- `updated_at`: Last modification timestamp

## Advanced: Adding Categories

If you want to add categories, you would:

1. Add a `category` column to the `policies` table in Supabase
2. Update the admin form to include a category dropdown
3. Update the API to save the category
4. Create a category filter in the UI

This would require code changes beyond the current setup.
