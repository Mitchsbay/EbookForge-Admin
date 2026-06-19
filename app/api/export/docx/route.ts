import { NextRequest, NextResponse } from 'next/server';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  convertInchesToTwip,
  PageBreak,
  ImageRun,
} from 'docx';
import { z } from 'zod';
import { resolveImageForExport } from '@/lib/supabase-storage';

export const runtime = 'nodejs';

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
    includeChapterTitlePages: z.boolean(),
    pageSize: z.string(),
    margins: z.string(),
    fontStyle: z.string(),
  }).optional(),
});

async function addImageToDocxSections(sections: Paragraph[], image: any, fallbackCaption = 'Image') {
  try {
    const exportImage = await resolveImageForExport(image);

    if (!exportImage) {
      sections.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: `[Image unavailable: ${image?.caption || fallbackCaption}]`,
            size: 20,
            italics: true,
          }),
        ],
        spacing: { before: 300, after: 100 },
      }));
      return;
    }

    sections.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new ImageRun({
          data: exportImage.buffer,
          transformation: {
            width: 430,
            height: 285,
          },
          type: exportImage.extension === 'jpg' ? 'jpg' : exportImage.extension,
        } as any),
      ],
      spacing: { before: 300, after: image?.caption ? 100 : 300 },
    }));

    if (image?.caption) {
      sections.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: image.caption,
            size: 20,
            italics: true,
          }),
        ],
        spacing: { after: 300 },
      }));
    }
  } catch (error) {
    console.error('DOCX image embed error:', error);
    sections.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `[Image could not be embedded: ${image?.caption || fallbackCaption}]`,
          size: 20,
          italics: true,
        }),
      ],
      spacing: { before: 300, after: 300 },
    }));
  }
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

    // Build document content
    const sections: Paragraph[] = [];

    // Title Page
    if (formatting?.includeTitlePage !== false) {
      sections.push(new Paragraph({
        children: [],
        spacing: { after: 4000 },
      }));

      sections.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: title,
            bold: true,
            size: 72,
          }),
        ],
        spacing: { after: 400 },
      }));

      if (subtitle && formatting?.includeSubtitle !== false) {
        sections.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: subtitle,
              italics: true,
              size: 36,
            }),
          ],
          spacing: { after: 800 },
        }));
      }

      if (author && formatting?.includeAuthor !== false) {
        sections.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: `by ${author}`,
              size: 28,
            }),
          ],
          spacing: { after: 2000 },
        }));
      }

      sections.push(new Paragraph({
        children: [new PageBreak()],
      }));
    }

    // Copyright Page
    if (formatting?.includeCopyright) {
      sections.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: 'Copyright',
            bold: true,
            size: 28,
          }),
        ],
        spacing: { after: 400 },
      }));

      sections.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: `© ${new Date().getFullYear()} ${author || 'Author'}`,
            size: 24,
          }),
        ],
        spacing: { after: 200 },
      }));

      sections.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: 'All rights reserved.',
            size: 24,
          }),
        ],
        spacing: { after: 800 },
      }));

      sections.push(new Paragraph({
        children: [
          new TextRun({
            text: 'This document is for informational purposes only. The author and publisher assume no liability for any actions taken based on this content. Please consult with appropriate professionals for specific advice.',
            size: 20,
            italics: true,
          }),
        ],
        spacing: { after: 400 },
      }));

      sections.push(new Paragraph({
        children: [new PageBreak()],
      }));
    }

    // Table of Contents
    if (formatting?.includeTableOfContents) {
      sections.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: 'Table of Contents',
            bold: true,
            size: 36,
          }),
        ],
        spacing: { after: 400 },
      }));

      for (let i = 0; i < chapters.length; i++) {
        sections.push(new Paragraph({
          children: [
            new TextRun({
              text: `${i + 1}. ${chapters[i].title}`,
              size: 24,
            }),
          ],
          spacing: { after: 100 },
        }));
      }

      sections.push(new Paragraph({
        children: [new PageBreak()],
      }));
    }

    // Chapters
    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];

      // Chapter title
      if (formatting?.includeChapterTitlePages !== false) {
        sections.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 2000, after: 800 },
          children: [
            new TextRun({
              text: chapter.title,
              bold: true,
              size: 48,
            }),
          ],
        }));
      } else {
        sections.push(new Paragraph({
          children: [
            new TextRun({
              text: chapter.title,
              bold: true,
              size: 36,
            }),
          ],
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 400 },
        }));
      }

      // Generated chapter images are embedded as real image files, not remote URLs.
      if (Array.isArray(chapter.images) && chapter.images.length > 0) {
        for (const image of chapter.images) {
          await addImageToDocxSections(sections, image);
        }
      }

      // Chapter content
      for (const block of chapter.content) {
        switch (block.type) {
          case 'heading':
            const hdgLevel = block.level || 2;
            let hdg: (typeof HeadingLevel)[keyof typeof HeadingLevel];
            let size: number;

            if (hdgLevel === 1) {
              hdg = HeadingLevel.HEADING_1;
              size = 36;
            } else if (hdgLevel === 2) {
              hdg = HeadingLevel.HEADING_2;
              size = 28;
            } else {
              hdg = HeadingLevel.HEADING_3;
              size = 24;
            }

            sections.push(new Paragraph({
              children: [
                new TextRun({
                  text: block.content,
                  bold: true,
                  size,
                }),
              ],
              heading: hdg,
              spacing: { before: 400, after: 200 },
            }));
            break;

          case 'paragraph':
            sections.push(new Paragraph({
              children: [
                new TextRun({
                  text: block.content,
                  size: 24,
                }),
              ],
              spacing: { after: 200 },
            }));
            break;

          case 'bullet-list':
            for (const item of block.items || []) {
              sections.push(new Paragraph({
                children: [
                  new TextRun({ text: '• ', size: 24 }),
                  new TextRun({ text: item.text, size: 24 }),
                ],
                spacing: { after: 100 },
                indent: { left: 600 },
              }));
            }
            break;

          case 'numbered-list':
            for (let j = 0; j < (block.items || []).length; j++) {
              sections.push(new Paragraph({
                children: [
                  new TextRun({ text: `${j + 1}. `, size: 24 }),
                  new TextRun({ text: block.items[j].text, size: 24 }),
                ],
                spacing: { after: 100 },
                indent: { left: 600 },
              }));
            }
            break;

          case 'callout':
            sections.push(new Paragraph({
              children: [
                new TextRun({
                  text: block.content,
                  size: 24,
                  italics: block.style === 'tip',
                }),
              ],
              spacing: { before: 200, after: 200 },
              indent: { left: 400, right: 400 },
              border: {
                left: { style: BorderStyle.SINGLE, size: 12, color: block.style === 'warning' ? 'f59e0b' : block.style === 'tip' ? '10b981' : '3b82f6' },
              },
            }));
            break;

          case 'image': {
            const matchingImage = chapter.images?.find((image: any) =>
              image.id === block.imageId || image.imageId === block.imageId || image.id === block.id
            );

            if (matchingImage) {
              await addImageToDocxSections(sections, { ...matchingImage, caption: block.caption || matchingImage.caption });
            } else {
              sections.push(new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: `[Image: ${block.content || block.caption || 'Image'}]`,
                    size: 20,
                    italics: true,
                  }),
                ],
                spacing: { before: 300, after: 100 },
              }));
              if (block.caption) {
                sections.push(new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: block.caption,
                      size: 20,
                      italics: true,
                    }),
                  ],
                  spacing: { after: 300 },
                }));
              }
            }
            break;
          }
        }
      }

      // Page break between chapters
      if (i < chapters.length - 1) {
        sections.push(new Paragraph({
          children: [new PageBreak()],
        }));
      }
    }

    // Create document
    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: convertInchesToTwip(1),
                right: convertInchesToTwip(1),
                bottom: convertInchesToTwip(1),
                left: convertInchesToTwip(1),
              },
            },
          },
          children: sections,
        },
      ],
    });

    // Generate buffer
    const buffer = await Packer.toBuffer(doc);

    // Return as base64
    const base64 = buffer.toString('base64');

    return NextResponse.json({
      success: true,
      docxBase64: base64,
      filename: `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.docx`,
    });
  } catch (error: any) {
    console.error('DOCX export error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate DOCX' },
      { status: 500 }
    );
  }
}
