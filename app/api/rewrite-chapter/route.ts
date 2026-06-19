import { NextRequest, NextResponse } from 'next/server';
import { getChapterTargetWords, rewriteChapterWithAI } from '@/lib/openai-utils';
import { RewriteSettings, EbookOutline, Chapter } from '@/lib/types';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { countWordsInContentBlocks } from '@/lib/word-count';

const optionalPositiveNumber = z.preprocess((value) => {
  if (value === '' || value === null || typeof value === 'undefined') return undefined;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : value;
  }
  return value;
}, z.number().positive().optional());

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
    customWordCount: optionalPositiveNumber,
    customWordsPerChapter: optionalPositiveNumber,
    customAudience: z.string().optional().nullable(),
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

    const typedSettings = settings as RewriteSettings;
    const typedOutline = outline as EbookOutline;
    const targetWords = getChapterTargetWords(typedSettings, typedOutline);

    // Rewrite the chapter (cast types)
    const result = await rewriteChapterWithAI(
      chapter as Chapter,
      typedSettings,
      typedOutline,
      bookTitle
    );

    // Add IDs to content blocks/items if missing
    const contentWithIds = result.content.map((block: any) => ({
      ...block,
      id: block.id || uuidv4(),
      items: Array.isArray(block.items)
        ? block.items.map((item: any) => ({ ...item, id: item.id || uuidv4() }))
        : block.items,
    }));

    // Never trust the AI-reported word count. The model can copy the example
    // value from the prompt, so calculate the real displayed/exported count here.
    const actualWordCount = countWordsInContentBlocks(contentWithIds);

    return NextResponse.json({
      success: true,
      chapter: {
        ...chapter,
        content: contentWithIds,
        wordCount: actualWordCount,
        status: 'rewritten',
        lastEdited: new Date().toISOString(),
      },
      suggestions: result.suggestions || [],
      targetWords,
    });
  } catch (error: any) {
    console.error('Rewrite chapter error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to rewrite chapter' },
      { status: 500 }
    );
  }
}
