import { NextRequest, NextResponse } from 'next/server';
import { createSignedImageUrl, isSupabaseStorageConfigured } from '@/lib/supabase-storage';
import { z } from 'zod';

export const runtime = 'nodejs';

const signedUrlSchema = z.object({
  storagePath: z.string().min(1),
  expiresIn: z.number().int().positive().max(60 * 60 * 24 * 7).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = signedUrlSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (!isSupabaseStorageConfigured()) {
      return NextResponse.json(
        { error: 'Supabase Storage is not configured.' },
        { status: 501 }
      );
    }

    const signedUrl = await createSignedImageUrl(
      parsed.data.storagePath,
      parsed.data.expiresIn || 60 * 60 * 24
    );

    return NextResponse.json({ success: true, signedUrl });
  } catch (error: unknown) {
    console.error('Create image signed URL error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create signed image URL';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
