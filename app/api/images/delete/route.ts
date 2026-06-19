import { NextRequest, NextResponse } from 'next/server';
import { deleteImageFromSupabaseStorage, isSupabaseStorageConfigured } from '@/lib/supabase-storage';
import { z } from 'zod';

export const runtime = 'nodejs';

const deleteImageSchema = z.object({
  storagePath: z.string().min(1),
});

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = deleteImageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (!isSupabaseStorageConfigured()) {
      return NextResponse.json({ success: true, skipped: true });
    }

    await deleteImageFromSupabaseStorage(parsed.data.storagePath);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Delete stored image error:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete stored image';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
