import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { z } from 'zod';

const exportRequestSchema = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  author: z.string().optional(),
  chapters: z.array(z.object({
    id: z.string(),
    title: z.string(),
    content: z.array(z.any()),
    images: z.array(z.any()),
  })),
  formatting: z.object({
    includeTitlePage: z.boolean(),
    includeSubtitle: z.boolean(),
    includeAuthor: z.boolean(),
    includeCopyright: z.boolean(),
    includeTableOfContents: z.boolean(),
    pageSize: z.string(),
    margins: z.string(),
    fontStyle: z.string(),
  }).optional(),
});

function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeXml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function getHtmlFromContent(block: any): string {
  switch (block.type) {
    case 'heading':
      const level = block.level || 1;
      return `<h${level}>${escapeHtml(block.content)}</h${level}>`;

    case 'paragraph':
      return `<p>${escapeHtml(block.content)}</p>`;

    case 'bullet-list':
      return '<ul>' + (block.items || []).map((item: any) =>
        `<li>${escapeHtml(item.text)}</li>`
      ).join('') + '</ul>';

    case 'numbered-list':
      return '<ol>' + (block.items || []).map((item: any, i: number) =>
        `<li>${escapeHtml(item.text)}</li>`
      ).join('') + '</ol>';

    case 'callout':
      const calloutClass = block.style === 'warning'
        ? 'callout-warning'
        : block.style === 'tip'
        ? 'callout-tip'
        : 'callout-note';
      return `<aside class="callout ${calloutClass}"><p>${escapeHtml(block.content)}</p></aside>`;

    case 'image':
      return `<figure class="image"><img src="../images/${block.imageId || block.id}.jpg" alt="${escapeHtml(block.altText || block.caption || 'Image')}" />${block.caption ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : ''}</figure>`;

    default:
      return '';
  }
}

function generateChapterXhtml(chapter: any, chapterIndex: number, totalChapters: number): string {
  const contentHtml = (chapter.content || []).map(getHtmlFromContent).join('\n    ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${escapeXml(chapter.title)}</title>
  <link rel="stylesheet" type="text/css" href="../styles.css"/>
</head>
<body>
  <section epub:type="chapter">
    <h1 class="chapter-title">${escapeHtml(chapter.title)}</h1>
    <div class="chapter-content">
      ${contentHtml}
    </div>
  </section>
</body>
</html>`;
}

function generateTitlePageXhtml(title: string, subtitle: string, author: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${escapeXml(title)}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <div class="title-page" epub:type="titlepage">
    <h1 class="book-title">${escapeHtml(title)}</h1>
    ${subtitle ? `<h2 class="book-subtitle">${escapeHtml(subtitle)}</h2>` : ''}
    ${author ? `<p class="book-author">by ${escapeHtml(author)}</p>` : ''}
  </div>
</body>
</html>`;
}

function generateCopyrightPageXhtml(title: string, author: string): string {
  const year = new Date().getFullYear();
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Copyright</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <div class="copyright-page" epub:type="copyright-page">
    <p class="copyright-text">Copyright © ${year} ${escapeHtml(author || 'Author')}</p>
    <p class="copyright-text">All rights reserved.</p>
    <p class="copyright-text spacer">No part of this publication may be reproduced, distributed, or transmitted in any form or by any means, including photocopying, recording, or other electronic or mechanical methods, without the prior written permission of the publisher, except in the case of brief quotations embodied in critical reviews and certain other noncommercial uses permitted by copyright law.</p>
    <p class="copyright-text">First Edition</p>
    <p class="copyright-text spacer">Published by ${escapeHtml(author || 'Publisher')}</p>
    <p class="copyright-text">Book design and formatting by EbookForge</p>
  </div>
</body>
</html>`;
}

function generateTocPageXhtml(chapters: any[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Table of Contents</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <div class="toc-page" epub:type="toc">
    <h1 class="toc-title">Table of Contents</h1>
    <nav epub:type="toc">
      <ol class="toc-list">
        ${chapters.map((ch, i) => `<li><a href="chapters/chapter_${String(i + 1).padStart(2, '0')}.xhtml">${escapeHtml(ch.title)}</a></li>`).join('\n        ')}
      </ol>
    </nav>
  </div>
</body>
</html>`;
}

function generateNavXhtml(chapters: any[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Navigation</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Table of Contents</h1>
    <ol>
      ${chapters.map((ch, i) => `<li><a href="chapters/chapter_${String(i + 1).padStart(2, '0')}.xhtml">${escapeHtml(ch.title)}</a></li>`).join('\n      ')}
    </ol>
  </nav>
</body>
</html>`;
}

function generateNcxFile(title: string, author: string, chapters: any[], uuid: string): string {
  const navPoints = chapters.map((ch, i) => {
    const navLabel = ch.title;
    return `    <navPoint id="navpoint-${i + 1}" playOrder="${i + 1}">
      <navLabel><text>${escapeXml(navLabel)}</text></navLabel>
      <content src="chapters/chapter_${String(i + 1).padStart(2, '0')}.xhtml"/>
    </navPoint>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${uuid}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle>
    <text>${escapeXml(title)}</text>
  </docTitle>
  <docAuthor>
    <text>${escapeXml(author || 'Unknown Author')}</text>
  </docAuthor>
  <navMap>
    <navPoint id="navpoint-0" playOrder="0">
      <navLabel><text>Table of Contents</text></navLabel>
      <content src="nav.xhtml"/>
    </navPoint>
${navPoints}
  </navMap>
</ncx>`;
}

function generateContentOpf(title: string, author: string, uuid: string, chapters: any[]): string {
  const manifestItems = [
    '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>',
    '<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>',
    '<item id="css" href="styles.css" media-type="text/css"/>',
    '<item id="title-page" href="title_page.xhtml" media-type="application/xhtml+xml"/>',
  ];

  chapters.forEach((ch, i) => {
    const chapterNum = String(i + 1).padStart(2, '0');
    manifestItems.push(`<item id="chapter-${chapterNum}" href="chapters/chapter_${chapterNum}.xhtml" media-type="application/xhtml+xml"/>`);
  });

  const spineItems = [
    '<itemref idref="title-page"/>',
  ];

  chapters.forEach((ch, i) => {
    const chapterNum = String(i + 1).padStart(2, '0');
    spineItems.push(`<itemref idref="chapter-${chapterNum}"/>`);
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="BookId">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="BookId">${uuid}</dc:identifier>
    <dc:title>${escapeXml(title)}</dc:title>
    <dc:creator>${escapeXml(author || 'Unknown Author')}</dc:creator>
    <dc:language>en</dc:language>
    <dc:date>${new Date().toISOString().split('T')[0]}</dc:date>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d{3}/, '')}</meta>
  </metadata>
  <manifest>
    ${manifestItems.join('\n    ')}
  </manifest>
  <spine toc="ncx">
    ${spineItems.join('\n    ')}
  </spine>
</package>`;
}

function generateContainerXml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
}

function generateCss(): string {
  return `/* EPUB 3.0 Styles - KDP Ready */
:root {
  --body-font: Georgia, Palatino, "Times New Roman", serif;
  --heading-font: Georgia, Palatino, "Times New Roman", serif;
  --text-color: #1a1a1a;
  --muted-color: #666666;
}

* {
  box-sizing: border-box;
}

html {
  font-size: 16px;
}

body {
  font-family: var(--body-font);
  line-height: 1.6;
  color: var(--text-color);
  margin: 0;
  padding: 2em 1em;
}

/* Paragraph Indentation - KDP Standard */
p {
  margin: 0;
  text-indent: 1.5em;
  text-align: justify;
}

/* First paragraph after heading has no indent */
h1 + p,
h2 + p,
h3 + p,
h4 + p,
h5 + p,
h6 + p {
  text-indent: 0;
}

/* First paragraph of chapter content has no indent */
.chapter-content > p:first-of-type {
  text-indent: 0;
}

/* Prevent indent on first p in any container */
p:first-of-type {
  text-indent: 0;
}

/* Adjacent sibling paragraphs - automatic indent */
p + p {
  text-indent: 1.5em;
  margin: 0;
}

/* Headings */
h1, h2, h3, h4, h5, h6 {
  font-family: var(--heading-font);
  font-weight: bold;
  line-height: 1.3;
  margin-top: 1.5em;
  margin-bottom: 0.75em;
  text-align: left;
}

h1 { font-size: 2em; }
h2 { font-size: 1.5em; }
h3 { font-size: 1.25em; }
h4 { font-size: 1.1em; }

/* Lists */
ul, ol {
  margin: 1em 0 1em 2em;
  padding: 0;
}

li {
  margin-bottom: 0.3em;
}

li p {
  text-indent: 0;
}

/* Title Page */
.title-page {
  text-align: center;
  padding: 20% 0;
  page-break-after: always;
}

.book-title {
  font-size: 2.5em;
  margin-bottom: 0.5em;
  text-align: center;
}

.book-subtitle {
  font-size: 1.25em;
  font-style: italic;
  color: var(--muted-color);
  margin-bottom: 1em;
  text-align: center;
}

.book-author {
  font-size: 1em;
  color: var(--muted-color);
  text-align: center;
}

/* Copyright Page */
.copyright-page {
  text-align: center;
  padding: 30% 2em;
  page-break-after: always;
}

.copyright-text {
  font-size: 0.85em;
  color: var(--muted-color);
  text-indent: 0;
  margin-bottom: 0.5em;
}

.copyright-text.spacer {
  margin-top: 2em;
}

/* Table of Contents */
.toc-page {
  page-break-after: always;
}

.toc-title {
  text-align: center;
  margin-bottom: 2em;
}

.toc-list {
  list-style-type: decimal;
  margin-left: 2em;
}

.toc-list li {
  margin-bottom: 0.8em;
}

.toc-list a {
  text-decoration: none;
  color: var(--text-color);
}

nav[epub\\:type="toc"] ol {
  list-style-type: decimal;
  margin-left: 1.5em;
}

nav[epub\\:type="toc"] li {
  margin-bottom: 0.5em;
}

/* Chapter Styles */
.chapter-title {
  text-align: center;
  margin-top: 3em;
  margin-bottom: 2em;
  page-break-before: always;
}

.chapter-content {
  text-align: justify;
}

/* Callouts */
.callout {
  margin: 1.5em 0;
  padding: 1em 1.5em;
  border-left: 3px solid #3b82f6;
  background: rgba(59, 130, 246, 0.05);
}

.callout p {
  text-indent: 0;
  margin: 0;
}

.callout-warning {
  border-left-color: #f59e0b;
  background: rgba(245, 158, 11, 0.05);
}

.callout-tip {
  border-left-color: #10b981;
  background: rgba(16, 185, 129, 0.05);
}

/* Images */
figure.image {
  margin: 1.5em 0;
  text-align: center;
}

figure.image img {
  max-width: 100%;
  height: auto;
}

figcaption {
  font-size: 0.9em;
  color: var(--muted-color);
  margin-top: 0.5em;
  font-style: italic;
  text-indent: 0;
}

/* Links */
a {
  color: inherit;
}
`;
}

function generateUuid(): string {
  return 'urn:uuid:' + 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = exportRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { title, subtitle, author, chapters, formatting } = parsed.data;
    const uuid = generateUuid();

    const zip = new JSZip();

    // CRITICAL: mimetype must be the FIRST file and UNCOMPRESSED for EPUB validation
    // This is required by the EPUB specification and Amazon KDP validation
    zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

    // META-INF/container.xml (standard deflate compression is fine)
    const metaInf = zip.folder('META-INF');
    metaInf?.file('container.xml', generateContainerXml());

    // OEBPS folder (main content)
    const oebps = zip.folder('OEBPS');
    const chaptersFolder = oebps?.folder('chapters');
    const imagesFolder = oebps?.folder('images');

    // Add content.opf
    oebps?.file('content.opf', generateContentOpf(title, author || 'Unknown Author', uuid, chapters));

    // Add toc.ncx
    oebps?.file('toc.ncx', generateNcxFile(title, author || 'Unknown Author', chapters, uuid));

    // Add nav.xhtml (EPUB 3 navigation document)
    oebps?.file('nav.xhtml', generateNavXhtml(chapters));

    // Add styles.css
    oebps?.file('styles.css', generateCss());

    // Add title page
    oebps?.file('title_page.xhtml', generateTitlePageXhtml(title, subtitle || '', author || ''));

    // Add copyright page if requested
    if (formatting?.includeCopyright) {
      oebps?.file('copyright_page.xhtml', generateCopyrightPageXhtml(title, author || ''));
    }

    // Add TOC page if requested
    if (formatting?.includeTableOfContents) {
      oebps?.file('toc_page.xhtml', generateTocPageXhtml(chapters));
    }

    // Add chapter XHTML files
    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];
      const chapterNumber = String(i + 1).padStart(2, '0');
      const chapterXhtml = generateChapterXhtml(chapter, i, chapters.length);
      chaptersFolder?.file(`chapter_${chapterNumber}.xhtml`, chapterXhtml);
    }

    // Add images
    if (imagesFolder) {
      for (const chapter of chapters) {
        if (chapter.images && chapter.images.length > 0) {
          for (const image of chapter.images) {
            if (image.base64Data) {
              imagesFolder.file(`${image.id}.jpg`, image.base64Data, { base64: true });
            }
          }
        }
      }
    }

    // Generate EPUB file with proper settings
    // The mimetype file is already uncompressed (STORE)
    // All other files use default DEFLATE compression
    const epubContent = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });
    const base64 = epubContent.toString('base64');

    return NextResponse.json({
      success: true,
      epubBase64: base64,
      filename: `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.epub`,
      uuid,
      note: 'Valid EPUB 3.0 file ready for Amazon KDP upload. mimetype is uncompressed as required by EPUB specification.',
    });
  } catch (error: any) {
    console.error('EPUB export error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate EPUB' },
      { status: 500 }
    );
  }
}
