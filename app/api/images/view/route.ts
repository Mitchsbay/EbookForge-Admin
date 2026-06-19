import { NextRequest, NextResponse } from 'next/server';
import { downloadImageFromSupabaseStorage, getImageMimeType, isSupabaseStorageConfigured } from '@/lib/supabase-storage';
import { z } from 'zod';

export const runtime = 'nodejs';

const imageViewSchema = z.object({
  path: z.string().min(1),
});

export async function GET(request: NextRequest) {
  try {
    if (!isSupabaseStorageConfigured()) {
      return NextResponse.json(
        { error: 'Supabase Storage is not configured.' },
        { status: 501 }
      );
    }

    const { searchParams } = new URL(request.url);
    const parsed = imageViewSchema.safeParse({ path: searchParams.get('path') });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Missing image storage path.', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const storagePath = parsed.data.path;
    const buffer = await downloadImageFromSupabaseStorage(storagePath);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': getImageMimeType({ storagePath }),
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error: unknown) {
    console.error('Image view error:', error);
    const message = error instanceof Error ? error.message : 'Failed to load image.';

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
