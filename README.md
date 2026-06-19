# EbookForge Admin

A private, single-admin web application for uploading Word documents, rewriting them into professional ebooks using OpenAI, generating AI images, and exporting in multiple formats ready for Amazon KDP publishing.

---

## Summary of Features

**EbookForge Admin** is a complete ebook production pipeline for solo authors and content creators:

- **Authentication**: Password-only admin login with JWT sessions
- **Document Upload**: DOCX upload with automatic text extraction and structure analysis
- **AI Outline Generation**: GPT-4o analyzes content and creates professional chapter structures
- **Comprehensive Rewrite Settings**: Book type, tone, audience, depth, content additions
- **Chapter-by-Chapter Rewriting**: Process content one chapter at a time
- **AI Image Generation**: OpenAI Image API integration for chapter illustrations
- **KDP-Ready Exports**: DOCX, PDF (hardcover layout), EPUB 3.0 packages
- **Sample Mode**: Test the full workflow without uploading files
- **Project Persistence**: Save/load project JSON for resuming work

---

## Required Environment Variables

```env
# OpenAI API (required for AI features)
OPENAI_API_KEY=sk-your-openai-api-key

# Optional image model settings
# Defaults to gpt-image-1. Use dall-e-3 only if you specifically want DALL-E output.
OPENAI_IMAGE_MODEL=gpt-image-1
# Optional for GPT image models: low, medium, high, or auto
OPENAI_IMAGE_QUALITY=auto

# Admin authentication (required)
ADMIN_PASSWORD=your_secure_password_here
SESSION_SECRET=random_32_character_string_minimum

# Supabase backend/storage (recommended for persistent generated images)
# Use the same Supabase project you control. Keep the service role key server-side only.
SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_STORAGE_BUCKET=ebookforge-images
```

- `ADMIN_PASSWORD`: The password required to access the admin panel
- `SESSION_SECRET`: Random string used to sign JWT tokens (min 32 characters)
- `OPENAI_API_KEY`: Your OpenAI API key with GPT-4o and OpenAI Image API access
- `OPENAI_IMAGE_MODEL` optional: defaults to `gpt-image-1`; you may set `dall-e-3` or `dall-e-2` if needed
- `OPENAI_IMAGE_QUALITY` optional: for GPT image models, use `low`, `medium`, `high`, or `auto`
- `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL`: your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: server-only key used by API routes to save/load project JSON and image files
- `SUPABASE_STORAGE_BUCKET`: optional bucket name, defaults to `ebookforge-images`

---

## Supabase Backend Setup

Run this SQL once in Supabase SQL Editor:

```sql
-- See supabase/ebookforge_backend_setup.sql in this repo for the full setup script.
```

That script creates:

- `public.ebook_projects` for project JSON autosave.
- A private `ebookforge-images` Storage bucket for generated PNG/JPEG/WebP files.

The app uses server-side Next.js API routes with `SUPABASE_SERVICE_ROLE_KEY`, so the service role key is never exposed in the browser. If Supabase variables are missing, the app falls back to the previous browser/localStorage behaviour, but generated images may still hit browser storage limits.

---

## How Password Login Works

The application uses JWT-based authentication with HTTP-only cookies:

1. **Login Page** (`/login`): Admin enters the password
2. **Validation**: Password compared against `ADMIN_PASSWORD` environment variable
3. **Session Creation**: On success, a JWT token is created with `jose` library
   - Algorithm: HS256
   - Expiration: 24 hours
   - Stored in HTTP-only cookie (`ebookforge_session`)
4. **Route Protection**: Middleware checks for valid token on all `/admin/*` routes
5. **Authentication Check**: Each API call verifies the JWT signature and expiration

Key security features:
- HTTP-only cookies (not accessible via JavaScript)
- Secure flag in production
- Same-site lax policy
- No password stored in database or localStorage

---

## How Document Upload Works

1. **File Selection**: Drag-and-drop or click to upload `.docx` files (up to 10MB)
2. **Text Extraction**: `mammoth.js` extracts raw text while preserving structure
3. **Document Analysis**: The server identifies:
   - Word count and estimated reading time
   - Detected sections and headings
   - Paragraph patterns
4. **Preview**: Shows extracted content with section breakdown
5. **Alternatives**:
   - **From Scratch**: Create empty project without uploading
   - **Sample Mode**: Pre-loaded sample personal finance ebook for testing

The analyzed document is stored in browser localStorage for the entire session.

---

## How OpenAI Rewriting Works

### Outline Generation
- Uses `gpt-4o` model
- Analyzes document title, raw text, and detected sections
- Generates structured chapter outline with title, summary, and sections
- Respects settings: book type, audience, content additions

### Chapter Rewriting
- Each chapter sent individually to avoid token limits
- Prompt includes:
  - Book type (nonfiction guide, novel, memoir, etc.)
  - Writing tone (professional, conversational, academic, etc.)
  - Audience level (general, beginner, expert)
  - Paragraph style (short, medium, long, balanced)
  - Bullet frequency (sparse, moderate, frequent)
  - Content additions (exercises, examples, case studies, key takeaways)
- Returns structured content with paragraphs, headings, lists, callouts
- Original content is locked and can be referenced

---

## How Image Generation Works

1. **Prompt Generation**: AI analyzes chapter content and suggests 1-3 image prompts
   - Suggests placement points within the text
   - Describes relevant subject matter
   - Offers style options (photorealistic, illustration, infographic)

2. **Admin Review**: Each prompt can be:
   - Approved for generation
   - Edited before generation
   - Rejected

3. **OpenAI Image Generation**: Approved prompts are sent to the configured image model
   - Defaults to `gpt-image-1`, 1024x1024 pixels, PNG output
   - `response_format` is only sent for `dall-e-2`/`dall-e-3`; GPT image models always return base64 data

4. **Persistent Storage**:
   - If Supabase is configured, generated image bytes are uploaded to the private `ebookforge-images` bucket.
   - The project stores the stable `storagePath`, not a huge base64 string.
   - The editor refreshes signed preview URLs after page reloads.
   - Project JSON is autosynced to the `ebook_projects` table.

5. **Gallery Management**: View all generated images, regenerate specific ones, and delete stored images

6. **Export Integration**: DOCX/PDF/EPUB/image ZIP exports fetch the real image file from Supabase Storage and embed/package the image bytes into the final files

---

## How Exports Work

### DOCX Export
- Full document with:
  - Title page (centered title, subtitle, author)
  - Copyright page
  - Table of contents
  - Chapters with headings, paragraphs, lists
  - Embedded generated images with captions
- Built with `docx` npm package
- Compatible with Microsoft Word, Google Docs, LibreOffice

### PDF Export (Hardcover Layout for KDP)
**Page Sizes Available:**
- 5 x 8 inches
- 5.5 x 8.5 inches
- 6 x 9 inches (default)
- Trade paperback (5.25 x 8)

**Alternating Margins for Hardcover Binding:**
- Inside margin (gutter): 0.75 inches
- Outside margin: 0.5 inches
- Left pages: gutter on left, outside on right
- Right pages: gutter on right, outside on left

**Headers and Page Numbers:**
- Even pages: Book title in header (left side)
- Odd pages: Chapter title in header (right side)
- Page numbers on bottom outer edge
- Front matter pages (title, copyright, TOC): NO headers or page numbers

**Typography:**
- First paragraph after heading: no indent
- Subsequent paragraphs: 1.5em indent
- Line height: 1.7 for readability

Generated images are resolved from local base64 or Supabase Storage before rendering, then embedded as image data inside the final PDF. Built with `@react-pdf/renderer`.

### EPUB 3.0 Export (Kindle Direct Publishing Ready)
Outputs a **true `.epub` file** - no conversion required.

**Structure:**
```
mimetype (uncompressed, first file)
/META-INF/
  container.xml
/OEBPS/
  content.opf
  toc.ncx
  nav.xhtml
  styles.css
  title_page.xhtml
  copyright_page.xhtml (optional)
  chapters/
    chapter_01.xhtml
    chapter_02.xhtml
    ...
  images/
    image_001.png
    ...
```

**Key Features:**
- **mimetype file**: Uncompressed (`STORE` compression) as required by EPUB spec
- **Valid EPUB 3.0**: Passes KDP validation without external software
- Separate XHTML files for each chapter
- Valid `toc.ncx` navigation file with navPoints
- EPUB 3 navigation document (`nav.xhtml`)
- `content.opf` manifest and spine

**CSS Paragraph Indentation (KDP Standard):**
```css
p + p {
  text-indent: 1.5em;
  margin: 0;
}

/* First paragraph after heading has no indent */
.chapter-content > p:first-of-type {
  text-indent: 0;
}
```

**Ready For:**
- Upload **directly** to Amazon KDP - no conversion needed
- Preview with Kindle Previewer (optional)

### Images ZIP
All generated images are bundled as separate PNG/JPG/WebP files for external use. Images can come from local base64 fallback data or Supabase Storage.

### Project JSON
Full project state saved for resuming work later. Contains all chapters, settings, and images as base64.

---

## How to Run Locally

```bash
# 1. Install dependencies
npm install

# 2. Create environment file
cp .env.example .env.local

# 3. Edit .env.local with your values:
#    OPENAI_API_KEY=sk-your-key
#    OPENAI_IMAGE_MODEL=gpt-image-1
#    ADMIN_PASSWORD=your-password
#    SESSION_SECRET=random-32-char-string

# 4. Start development server
npm run dev

# 5. Open browser
#    http://localhost:3000
```

The dev server will automatically redirect you to login if not authenticated.

---

## How to Deploy to Vercel

1. **Push to GitHub**: Commit all files to a Git repository

2. **Import in Vercel**:
   - Go to vercel.com
   - Click "Add New Project"
   - Import your GitHub repository

3. **Set Environment Variables**:
   In the Vercel dashboard, add these environment variables:
   - `OPENAI_API_KEY` - Your OpenAI API key
   - `OPENAI_IMAGE_MODEL` - Optional, defaults to `gpt-image-1`
   - `ADMIN_PASSWORD` - Secure admin password
   - `SESSION_SECRET` - Random 32+ character string

4. **Deploy**: Click Deploy and wait for build to complete

5. **Access**: Your app will be available at `your-project.vercel.app`

---

## Known Limitations

1. **No Database**: Projects stored in browser localStorage only
   - Clearing browser data loses all projects
   - Export project JSON to save backups

2. **Image Storage**: Images stored as base64 in project JSON
   - Large projects may have large JSON files
   - Use "Images ZIP" export for external storage

3. **Single Admin**: Only one admin password supported
   - No multi-user authentication
   - No role-based access control

4. **OpenAI Costs**: All AI features require OpenAI API calls
   - Outline generation: ~$0.01-0.03 per document
   - Chapter rewriting: ~$0.01-0.05 per chapter
   - Image generation: $0.04 per image (DALL-E 3)

5. **PDF Layouts**: Complex formatting may not render perfectly
   - Images shown as placeholders
   - Tables not supported

---

## Technical Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Authentication | jose (JWT) |
| Document Parsing | mammoth.js |
| DOCX Generation | docx package |
| PDF Generation | @react-pdf/renderer |
| EPUB/ZIP Creation | JSZip |
| AI Text | OpenAI GPT-4o |
| AI Images | OpenAI DALL-E 3 |
| Validation | Zod |

---

## Application Structure

```
app/
├── login/page.tsx          - Password login
├── admin/
│   ├── layout.tsx          - Sidebar navigation wrapper
│   ├── page.tsx           - Dashboard
│   ├── new/page.tsx       - Start new project
│   ├── upload/page.tsx    - DOCX upload
│   ├── outline/page.tsx   - Chapter outline editor
│   ├── settings/page.tsx  - Rewrite/formatting/image settings
│   ├── chapters/page.tsx  - Chapter editor with AI rewrite
│   ├── images/page.tsx    - Image prompt/generation
│   ├── preview/page.tsx   - Full book preview
│   └── export/page.tsx    - Export options
├── api/
│   ├── auth/              - Login, logout, check
│   ├── extract-docx/      - DOCX text extraction
│   ├── generate-outline/  - AI outline generation
│   ├── rewrite-chapter/   - AI chapter rewriting
│   ├── generate-image-prompts/  - AI image suggestions
│   ├── generate-image/    - DALL-E 3 image generation
│   └── export/
│       ├── docx/          - Word export
│       ├── pdf/           - PDF export (hardcover layout)
│       ├── epub/          - EPUB 3.0 package
│       └── images-zip/    - Images bundle
lib/
├── auth.ts                - JWT authentication
├── types.ts               - TypeScript interfaces
├── constants.ts           - Config options, templates
└── openai-utils.ts        - OpenAI integration
middleware.ts              - Route protection
```

---

## Workflow Diagram

```
Upload Document → Generate Outline → Settings → Rewrite Chapters → Generate Images → Preview → Export
```

1. **Upload**: Extract text, analyze structure, estimate word count
2. **Outline**: AI generates chapter breakdown, drag to reorder, lock to protect
3. **Settings**: Choose book type, tone, audience, paragraph style, additions
4. **Chapters**: Rewrite one by one, edit output, add notes
5. **Images**: Generate prompts, approve, create with DALL-E
6. **Preview**: Review full book, check publishing readiness
7. **Export**: Download DOCX/PDF/EPUB/JSON

---

## License

Private tool - All rights reserved.
