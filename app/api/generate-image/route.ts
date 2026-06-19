import { NextRequest, NextResponse } from 'next/server';
import { generateImageUrl } from '@/lib/openai-utils';
import {
  isSupabaseStorageConfigured,
  uploadBase64ImageToSupabaseStorage,
} from '@/lib/supabase-storage';
import { z } from 'zod';

export const runtime = 'nodejs';

const imageRequestSchema = z.object({
  prompt: z.string().min(1),
  style: z.string().default('soft-editorial'),
  projectId: z.string().optional(),
  chapterId: z.string().optional(),
  imageId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = imageRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured.' },
        { status: 500 }
      );
    }

    const { prompt, style, projectId, chapterId } = parsed.data;
    const imageId = parsed.data.imageId || crypto.randomUUID();

    const base64Data = await generateImageUrl(prompt, style);

    const imagePayload: Record<string, unknown> = {
      id: imageId,
      generatedAt: new Date().toISOString(),
      prompt,
      style,
      mimeType: 'image/png',
      extension: 'png',
      storageProvider: 'local',
      base64Data,
    };

    if (isSupabaseStorageConfigured()) {
      try {
        const storedImage = await uploadBase64ImageToSupabaseStorage({
          base64Data,
          projectId,
          chapterId,
          imageId,
          mimeType: 'image/png',
          extension: 'png',
        });

        imagePayload.storageProvider = storedImage.storageProvider;
        imagePayload.storagePath = storedImage.storagePath;
        imagePayload.previewUrl = storedImage.previewUrl;
        imagePayload.mimeType = storedImage.mimeType;
        imagePayload.extension = storedImage.extension;
        delete imagePayload.base64Data;
      } catch (storageError) {
        console.error('Supabase image storage failed; falling back to base64 response:', storageError);
        imagePayload.storageWarning = storageError instanceof Error
          ? storageError.message
          : 'Supabase image storage failed. Image returned as base64 fallback.';
      }
    }

    return NextResponse.json({
      success: true,
      image: imagePayload,
    });
  } catch (error: unknown) {
    console.error('Generate image error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate image';

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
