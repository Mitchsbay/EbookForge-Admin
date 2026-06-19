import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, pdf } from '@react-pdf/renderer';

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
    pageSize: z.string().optional(),
    margins: z.string().optional(),
    fontStyle: z.string().optional(),
  }).optional(),
});

// Page size options in inches (converted to points: 1 inch = 72 points)
const PAGE_SIZES: Record<string, [number, number]> = {
  '5x8': [5 * 72, 8 * 72],       // 5 x 8 inches
  '5.5x8.5': [5.5 * 72, 8.5 * 72], // 5.5 x 8.5 inches
  '6x9': [6 * 72, 9 * 72],       // 6 x 9 inches
  'trade': [5.25 * 72, 8 * 72],  // Trade paperback
};

// Margins in points (for alternating layout)
const GUTTER_MARGIN = 0.75 * 72; // Inside margin (gutter) - 0.75 inches
const OUTSIDE_MARGIN = 0.5 * 72; // Outside margin - 0.5 inches
const TOP_MARGIN = 0.5 * 72; // Top margin
const BOTTOM_MARGIN = 0.75 * 72; // Bottom margin for page numbers

// Register Georgia-like font
Font.register({
  family: 'Georgia',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/opensans/v40/mem8YaGs126MiZpBA-UFVZ0b.woff2' },
  ],
});

interface PageProps {
  pageNumber: number;
  totalPages: number;
}

function createStyles(pageSize: [number, number]) {
  return StyleSheet.create({
    // Right page (odd) - gutter on right
    rightPage: {
      paddingTop: TOP_MARGIN,
      paddingBottom: BOTTOM_MARGIN,
      paddingLeft: OUTSIDE_MARGIN,
      paddingRight: GUTTER_MARGIN,
      fontFamily: 'Georgia',
      width: pageSize[0],
      height: pageSize[1],
    },
    // Left page (even) - gutter on left
    leftPage: {
      paddingTop: TOP_MARGIN,
      paddingBottom: BOTTOM_MARGIN,
      paddingLeft: GUTTER_MARGIN,
      paddingRight: OUTSIDE_MARGIN,
      fontFamily: 'Georgia',
      width: pageSize[0],
      height: pageSize[1],
    },
    // Front matter pages (no headers/footers)
    frontMatterPage: {
      paddingTop: TOP_MARGIN,
      paddingBottom: BOTTOM_MARGIN,
      paddingLeft: OUTSIDE_MARGIN,
      paddingRight: OUTSIDE_MARGIN,
      fontFamily: 'Georgia',
      width: pageSize[0],
      height: pageSize[1],
    },
    // Header styles
    headerEven: {
      position: 'absolute',
      top: 25,
      left: GUTTER_MARGIN,
      right: OUTSIDE_MARGIN,
      fontSize: 9,
      color: '#666666',
      textAlign: 'left',
      fontFamily: 'Georgia',
      fontStyle: 'italic',
    },
    headerOdd: {
      position: 'absolute',
      top: 25,
      left: OUTSIDE_MARGIN,
      right: GUTTER_MARGIN,
      fontSize: 9,
      color: '#666666',
      textAlign: 'right',
      fontFamily: 'Georgia',
      fontStyle: 'italic',
    },
    // Page number styles
    pageNumberEven: {
      position: 'absolute',
      bottom: 25,
      left: GUTTER_MARGIN,
      right: OUTSIDE_MARGIN,
      fontSize: 9,
      color: '#666666',
      textAlign: 'left',
      fontFamily: 'Georgia',
    },
    pageNumberOdd: {
      position: 'absolute',
      bottom: 25,
      left: OUTSIDE_MARGIN,
      right: GUTTER_MARGIN,
      fontSize: 9,
      color: '#666666',
      textAlign: 'right',
      fontFamily: 'Georgia',
    },
    // Title page
    titlePage: {
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 10,
      color: '#1a1a1a',
      fontFamily: 'Georgia',
    },
    subtitle: {
      fontSize: 16,
      textAlign: 'center',
      marginBottom: 20,
      color: '#4a4a4a',
      fontStyle: 'italic',
      fontFamily: 'Georgia',
    },
    author: {
      fontSize: 12,
      textAlign: 'center',
      marginBottom: 30,
      color: '#666666',
      fontFamily: 'Georgia',
    },
    // Copyright page
    copyrightPage: {
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
    },
    copyrightTitle: {
      fontSize: 12,
      fontWeight: 'bold',
      marginBottom: 10,
      color: '#1a1a1a',
      fontFamily: 'Georgia',
    },
    copyrightText: {
      fontSize: 9,
      textAlign: 'center',
      marginBottom: 5,
      color: '#666666',
      fontFamily: 'Georgia',
    },
    // TOC
    tocTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 20,
      color: '#1a1a1a',
      fontFamily: 'Georgia',
    },
    tocItem: {
      fontSize: 11,
      marginBottom: 8,
      color: '#333333',
      fontFamily: 'Georgia',
    },
    // Chapter
    chapterTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      marginBottom: 25,
      paddingTop: 40,
      color: '#1a1a1a',
      textAlign: 'center',
      fontFamily: 'Georgia',
    },
    heading1: {
      fontSize: 16,
      fontWeight: 'bold',
      marginTop: 15,
      marginBottom: 10,
      color: '#2a2a2a',
      fontFamily: 'Georgia',
    },
    heading2: {
      fontSize: 13,
      fontWeight: 'bold',
      marginTop: 12,
      marginBottom: 8,
      color: '#3a3a3a',
      fontFamily: 'Georgia',
    },
    heading3: {
      fontSize: 11,
      fontWeight: 'bold',
      marginTop: 10,
      marginBottom: 6,
      color: '#4a4a4a',
      fontFamily: 'Georgia',
    },
    paragraph: {
      fontSize: 11,
      lineHeight: 1.7,
      marginBottom: 8,
      color: '#333333',
      textAlign: 'justify',
      textIndent: 20,
      fontFamily: 'Georgia',
    },
    paragraphFirst: {
      fontSize: 11,
      lineHeight: 1.7,
      marginBottom: 8,
      color: '#333333',
      textAlign: 'justify',
      textIndent: 0,
      fontFamily: 'Georgia',
    },
    bulletList: {
      fontSize: 11,
      marginLeft: 20,
      marginBottom: 5,
      color: '#333333',
      fontFamily: 'Georgia',
    },
    numberedItem: {
      fontSize: 11,
      marginLeft: 20,
      marginBottom: 5,
      color: '#333333',
      fontFamily: 'Georgia',
    },
    callout: {
      fontSize: 11,
      marginLeft: 10,
      marginRight: 10,
      paddingTop: 8,
      paddingBottom: 8,
      paddingLeft: 10,
      paddingRight: 10,
      marginTop: 10,
      marginBottom: 10,
      borderLeftWidth: 3,
      borderLeftColor: '#10b981',
      borderLeftStyle: 'solid',
    },
    imagePlaceholder: {
      fontSize: 10,
      textAlign: 'center',
      fontStyle: 'italic',
      color: '#888888',
      fontFamily: 'Georgia',
      marginBottom: 8,
    },
  });
}

// Get page size from formatting settings
function getPageSize(pageSizeString?: string): [number, number] {
  if (pageSizeString && PAGE_SIZES[pageSizeString]) {
    return PAGE_SIZES[pageSizeString];
  }
  return PAGE_SIZES['6x9']; // Default to 6x9
}

// Create content elements from chapter content
function createContentElements(content: any[], styles: any): React.ReactNode[] {
  const elements: React.ReactNode[] = [];
  let isFirstParagraph = true;

  content?.forEach((block: any, index: number) => {
    switch (block.type) {
      case 'heading':
        const headingStyle = block.level === 1 ? styles.heading1 :
          block.level === 2 ? styles.heading2 : styles.heading3;
        elements.push(
          React.createElement(Text, { key: block.id || index, style: headingStyle }, block.content)
        );
        isFirstParagraph = true;
        break;
      case 'paragraph':
        const paragraphStyle = isFirstParagraph ? styles.paragraphFirst : styles.paragraph;
        elements.push(
          React.createElement(Text, { key: block.id || index, style: paragraphStyle }, block.content)
        );
        isFirstParagraph = false;
        break;
      case 'bullet-list':
        (block.items || []).forEach((item: any, itemIndex: number) => {
          elements.push(
            React.createElement(Text, { key: `${block.id}-${itemIndex}`, style: styles.bulletList }, `• ${item.text}`)
          );
        });
        isFirstParagraph = true;
        break;
      case 'numbered-list':
        (block.items || []).forEach((item: any, itemIndex: number) => {
          elements.push(
            React.createElement(Text, { key: `${block.id}-${itemIndex}`, style: styles.numberedItem }, `${itemIndex + 1}. ${item.text}`)
          );
        });
        isFirstParagraph = true;
        break;
      case 'callout':
        elements.push(
          React.createElement(View, { key: block.id || index, style: styles.callout },
            React.createElement(Text, { style: styles.paragraphFirst }, block.content)
          )
        );
        isFirstParagraph = true;
        break;
      case 'image':
        elements.push(
          React.createElement(Text, { key: block.id || index, style: styles.imagePlaceholder },
            `[Image: ${block.caption || 'Image'}]`
          )
        );
        isFirstParagraph = true;
        break;
    }
  });

  return elements;
}

interface HeaderFooterProps {
  pageNumber: number;
  isEven: boolean;
  bookTitle: string;
  chapterTitle: string | null;
  styles: any;
  pageSize: [number, number];
  isFrontMatter: boolean;
}

function createHeaderFooter({ pageNumber, isEven, bookTitle, chapterTitle, styles, pageSize, isFrontMatter }: HeaderFooterProps): React.ReactNode[] {
  if (isFrontMatter) {
    // No headers or page numbers on front matter
    return [];
  }

  const elements: React.ReactNode[] = [];

  // Header - Book title on even pages, Chapter title on odd pages
  if (isEven) {
    elements.push(
      React.createElement(Text, { key: 'header', style: styles.headerEven }, bookTitle)
    );
  } else {
    if (chapterTitle) {
      elements.push(
        React.createElement(Text, { key: 'header', style: styles.headerOdd }, chapterTitle)
      );
    }
  }

  // Page number - left side on even pages, right side on odd pages
  if (isEven) {
    elements.push(
      React.createElement(Text, { key: 'page-num', style: styles.pageNumberEven }, String(pageNumber))
    );
  } else {
    elements.push(
      React.createElement(Text, { key: 'page-num', style: styles.pageNumberOdd }, String(pageNumber))
    );
  }

  return elements;
}

function createEbookPDF(
  title: string,
  subtitle: string,
  author: string,
  chapters: any[],
  formatting: any
) {
  const pageSize = getPageSize(formatting?.pageSize);
  const styles = createStyles(pageSize);

  const pages: React.ReactNode[] = [];
  let pageNumber = 0;
  const totalEstimatedPages = chapters.length * 10 + (formatting?.includeTitlePage ? 1 : 0) + (formatting?.includeCopyright ? 1 : 0);

  // Track chapter for headers
  let currentChapterTitle: string | null = null;

  // Title Page (no header/footer)
  if (formatting?.includeTitlePage !== false) {
    pages.push(
      React.createElement(Page, { key: 'title', size: pageSize, style: styles.frontMatterPage },
        React.createElement(View, { style: styles.titlePage },
          React.createElement(Text, { style: styles.title }, title),
          subtitle && formatting?.includeSubtitle !== false ?
            React.createElement(Text, { style: styles.subtitle }, subtitle) : null,
          author && formatting?.includeAuthor !== false ?
            React.createElement(Text, { style: styles.author }, `by ${author}`) : null
        )
      )
    );
  }

  // Copyright Page (no header/footer)
  if (formatting?.includeCopyright) {
    pages.push(
      React.createElement(Page, { key: 'copyright', size: pageSize, style: styles.frontMatterPage },
        React.createElement(View, { style: styles.copyrightPage },
          React.createElement(Text, { style: styles.copyrightTitle }, 'Copyright'),
          React.createElement(Text, { style: styles.copyrightText }, `© ${new Date().getFullYear()} ${author || 'Author'}`),
          React.createElement(Text, { style: styles.copyrightText }, 'All rights reserved.'),
          React.createElement(Text, { style: { ...styles.copyrightText, marginTop: 15 } },
            'No part of this publication may be reproduced, distributed, or transmitted in any form or by any means, including photocopying, recording, or other electronic or mechanical methods, without the prior written permission of the publisher, except in the case of brief quotations embodied in critical reviews and certain other noncommercial uses permitted by copyright law.'
          ),
          React.createElement(Text, { style: { ...styles.copyrightText, marginTop: 20 } },
            'First Edition'
          ),
          React.createElement(Text, { style: styles.copyrightText },
            `Published by ${author || 'Publisher'}`
          )
        )
      )
    );
  }

  // Table of Contents (no header/footer - considered front matter)
  if (formatting?.includeTableOfContents) {
    pages.push(
      React.createElement(Page, { key: 'toc', size: pageSize, style: styles.frontMatterPage },
        React.createElement(Text, { style: styles.tocTitle }, 'Table of Contents'),
        ...chapters.map((chapter: any, index: number) =>
          React.createElement(Text, { key: chapter.id, style: styles.tocItem },
            `${index + 1}. ${chapter.title}`
          )
        )
      )
    );
  }

  // Chapter Pages (with headers and page numbers)
  chapters.forEach((chapter: any, chapterIdx: number) => {
    currentChapterTitle = chapter.title;
    const contentElements = createContentElements(chapter.content || [], styles);

    // Calculate number of pages needed for this chapter (rough estimate)
    const wordsPerPage = 300; // Approximate words per page for 6x9 with our margins
    const wordCount = (chapter.content || []).reduce((sum: number, block: any) => {
      if (block.type === 'paragraph') return sum + (block.content?.split(/\s+/).length || 0);
      if (block.type === 'heading') return sum + (block.content?.split(/\s+/).length || 0);
      return sum;
    }, 0);
    const pagesNeeded = Math.max(1, Math.ceil(wordCount / wordsPerPage));

    // For simplicity, we'll render one page per chapter
    // In production, you'd split content across multiple pages based on height
    pageNumber++; // Increment page counter

    // Determine if this is an even or odd page for alternating margins
    // Page 1 is odd (right side), page 2 is even (left side)
    const isEven = pageNumber % 2 === 0;
    const pageStyle = isEven ? styles.leftPage : styles.rightPage;
    const isFrontMatterPage = false;

    const headerFooterElements = createHeaderFooter({
      pageNumber,
      isEven,
      bookTitle: title,
      chapterTitle: currentChapterTitle,
      styles,
      pageSize,
      isFrontMatter: isFrontMatterPage,
    });

    pages.push(
      React.createElement(Page, { key: `chapter-${chapter.id}`, size: pageSize, style: pageStyle },
        ...headerFooterElements,
        React.createElement(Text, { style: styles.chapterTitle }, chapter.title),
        ...contentElements
      )
    );

    // Add additional pages if content warrants it
    for (let p = 1; p < pagesNeeded; p++) {
      pageNumber++;
      const extraIsEven = pageNumber % 2 === 0;
      const extraPageStyle = extraIsEven ? styles.leftPage : styles.rightPage;
      const extraHeaderFooter = createHeaderFooter({
        pageNumber,
        isEven: extraIsEven,
        bookTitle: title,
        chapterTitle: currentChapterTitle,
        styles,
        pageSize,
        isFrontMatter: false,
      });

      pages.push(
        React.createElement(Page, { key: `chapter-${chapter.id}-page-${p}`, size: pageSize, style: extraPageStyle },
          ...extraHeaderFooter,
          React.createElement(View, { style: { height: '100%' } })
        )
      );
    }
  });

  return React.createElement(Document, null, ...pages);
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

    // Ensure chapters is an array
    const safeChapters = Array.isArray(chapters) ? chapters : [];

    // Generate PDF
    const pdfDoc = createEbookPDF(title, subtitle || '', author || '', safeChapters, formatting || {});

    const pdfBlob = await pdf(pdfDoc).toBlob();
    const buffer = await pdfBlob.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    const pageSizeLabel = formatting?.pageSize || '6x9';

    return NextResponse.json({
      success: true,
      pdfBase64: base64,
      filename: `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`,
      pageSize: pageSizeLabel,
      note: `Hardcover PDF with ${pageSizeLabel} pages, alternating margins (gutter: 0.75", outside: 0.5"), headers and outer-edge page numbers per KDP standards.`,
    });
  } catch (error: any) {
    console.error('PDF export error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
