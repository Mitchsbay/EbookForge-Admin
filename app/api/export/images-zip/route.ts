import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { z } from 'zod';
import { resolveImageForExport } from '@/lib/supabase-storage';

export const runtime = 'nodejs';

const exportRequestSchema = z.object({
  chapters: z.array(z.object({
    id: z.string(),
    title: z.string(),
    images: z.array(z.any()),
  })),
});

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

    const { chapters } = parsed.data;

    const zip = new JSZip();

    // Collect all images from local base64 or Supabase Storage paths.
    let imageCount = 0;
    for (const chapter of chapters) {
      if (chapter.images && chapter.images.length > 0) {
        for (const image of chapter.images) {
          const exportImage = await resolveImageForExport(image);
          if (exportImage) {
            const sanitizedTitle = chapter.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const fileName = `${sanitizedTitle}_${exportImage.filename}`;
            zip.file(fileName, exportImage.buffer);
            imageCount++;
          }
        }
      }
    }

    if (imageCount === 0) {
      return NextResponse.json({
        success: true,
        zipBase64: '',
        filename: 'images.zip',
        message: 'No images found to export.',
      });
    }

    const zipContent = await zip.generateAsync({ type: 'nodebuffer' });
    const base64 = zipContent.toString('base64');

    return NextResponse.json({
      success: true,
      zipBase64: base64,
      filename: 'images.zip',
      imageCount,
    });
  } catch (error: any) {
    console.error('Images export error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to export images' },
      { status: 500 }
    );
  }
}
