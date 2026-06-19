import { NextRequest, NextResponse } from 'next/server';
import { rewriteChapterWithAI } from '@/lib/openai-utils';
import { RewriteSettings, EbookOutline, Chapter } from '@/lib/types';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

const rewriteRequestSchema = z.object({
  chapter: z.object({
    id: z.string(),
    title: z.string(),
    content: z.array(z.any()),
    originalContent: z.string().optional(),
  }),
  settings: z.object({
    bookType: z.string(),
    targetLength: z.string(),
    chapterLength: z.string(),
    writingTone: z.string(),
    audience: z.string(),
    paragraphStyle: z.string(),
    bulletStyle: z.string(),
    rewriteDepth: z.string(),
    contentAdditions: z.array(z.string()),
  }),
  outline: z.object({
    chapters: z.array(z.any()),
  }),
  bookTitle: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = rewriteRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Check for OpenAI key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured.' },
        { status: 500 }
      );
    }

    const { chapter, settings, outline, bookTitle } = parsed.data;

    // Rewrite the chapter (cast types)
    const result = await rewriteChapterWithAI(
      chapter as Chapter,
      settings as RewriteSettings,
      outline as EbookOutline,
      bookTitle
    );

    // Add IDs to content blocks if missing
    const contentWithIds = result.content.map((block: any) => ({
      ...block,
      id: block.id || uuidv4(),
    }));

    return NextResponse.json({
      success: true,
      chapter: {
        ...chapter,
        content: contentWithIds,
        wordCount: result.wordCount,
        status: 'rewritten',
        lastEdited: new Date().toISOString(),
      },
      suggestions: result.suggestions || [],
    });
  } catch (error: any) {
    console.error('Rewrite chapter error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to rewrite chapter' },
      { status: 500 }
    );
  }
}
