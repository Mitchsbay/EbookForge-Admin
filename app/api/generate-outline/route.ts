import { NextRequest, NextResponse } from 'next/server';
import { generateAOutline } from '@/lib/openai-utils';
import { RewriteSettings } from '@/lib/types';
import { z } from 'zod';

const outlineRequestSchema = z.object({
  documentTitle: z.string(),
  rawText: z.string(),
  detectedSections: z.array(z.object({
    title: z.string(),
    content: z.string(),
  })),
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
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = outlineRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { documentTitle, rawText, detectedSections, settings } = parsed.data;

    // Check for OpenAI key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured. Please set OPENAI_API_KEY in environment variables.' },
        { status: 500 }
      );
    }

    // Generate outline using AI (cast settings to expected type)
    const result = await generateAOutline(documentTitle, rawText, detectedSections, settings as RewriteSettings);

    return NextResponse.json({
      success: true,
      outline: result.chapters,
      warnings: result.warnings || [],
    });
  } catch (error: any) {
    console.error('Generate outline error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate outline' },
      { status: 500 }
    );
  }
}
