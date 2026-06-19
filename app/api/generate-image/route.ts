import { NextRequest, NextResponse } from 'next/server';
import { generateImageUrl } from '@/lib/openai-utils';
import { z } from 'zod';

const imageRequestSchema = z.object({
  prompt: z.string(),
  style: z.string().default('soft-editorial'),
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

    const { prompt, style } = parsed.data;

    const base64Data = await generateImageUrl(prompt, style);

    return NextResponse.json({
      success: true,
      image: {
        base64Data,
        generatedAt: new Date().toISOString(),
        prompt,
        style,
      },
    });
  } catch (error: any) {
    console.error('Generate image error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate image' },
      { status: 500 }
    );
  }
}
