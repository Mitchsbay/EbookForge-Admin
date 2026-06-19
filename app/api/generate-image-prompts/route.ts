import { NextRequest, NextResponse } from 'next/server';
import { generateImageSuggestions } from '@/lib/openai-utils';
import { z } from 'zod';

const promptRequestSchema = z.object({
  chapterTitle: z.string(),
  chapterContent: z.string(),
  bookTitle: z.string(),
  imageStyle: z.string().default('soft-editorial'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = promptRequestSchema.safeParse(body);

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

    const { chapterTitle, chapterContent, bookTitle, imageStyle } = parsed.data;

    const suggestions = await generateImageSuggestions(
      chapterTitle,
      chapterContent,
      bookTitle,
      imageStyle
    );

    return NextResponse.json({
      success: true,
      suggestions,
    });
  } catch (error: any) {
    console.error('Generate image prompts error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate image prompts' },
      { status: 500 }
    );
  }
}
