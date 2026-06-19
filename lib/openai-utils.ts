import { EbookProject, Chapter, ChapterContent, ImageSuggestion, OutlineChapter } from './types';
import {
  RewriteSettings,
  EbookOutline,
  ContentAddition,
  WritingTone,
  ParagraphStyle,
  BulletStyle,
  Audience,
} from './types';
import { countWordsInContentBlocks } from './word-count';

interface OpenAIGenerateOutlineResult {
  chapters: OutlineChapter[];
  warnings?: string[];
}

interface OpenAIRewriteChapterResult {
  content: ChapterContent[];
  wordCount: number;
  suggestions?: string[];
}

interface OpenAIImagePromptsResult {
  suggestions: ImageSuggestion[];
}

function getOpenAIKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error('OPENAI_API_KEY environment variable is not configured');
  }
  return key;
}

function getTonePrompt(tone: WritingTone): string {
  const toneMap: Record<WritingTone, string> = {
    'professional': 'Write in a professional, authoritative tone suitable for business and academic contexts.',
    'friendly': 'Write in a friendly, approachable tone that makes readers feel comfortable.',
    'conversational': 'Write in a conversational, natural style as if speaking directly to the reader.',
    'warm-reassuring': 'Write in a warm, reassuring tone that helps readers feel supported and understood.',
    'authoritative': 'Write with authority and expertise, demonstrating deep knowledge of the subject.',
    'expert-simple': 'Write as an expert who can explain complex topics in simple, understandable terms.',
    'premium-consultant': 'Write in a premium, sophisticated tone appropriate for high-value consulting.',
    'plain-english': 'Write in clear, simple Plain English accessible to all readers.',
    'marketing-persuasive': 'Write in a persuasive, engaging style that motivates readers to take action.',
    'kdp-nonfiction': 'Write in a clear, engaging KDP nonfiction style with actionable advice and examples.',
  };
  return toneMap[tone] || toneMap['professional'];
}

function getParagraphPrompt(style: ParagraphStyle): string {
  const styleMap: Record<ParagraphStyle, string> = {
    'short-modern': 'Use short, modern paragraphs (2-3 sentences each) that are easy to scan.',
    'balanced': 'Use balanced paragraphs of moderate length with good flow between ideas.',
    'detailed-explanatory': 'Use longer, detailed paragraphs that thoroughly explain each concept.',
    'very-simple': 'Use very simple paragraphs with basic vocabulary and clear structure.',
    'formal-publishing': 'Use formal publishing-style paragraphs appropriate for print books.',
    'blog-style': 'Use friendly blog-style paragraphs with varied length and engaging flow.',
    'premium-ebook': 'Use premium ebook-style paragraphs with professional formatting and flow.',
  };
  return styleMap[style] || styleMap['balanced'];
}

function getBulletPrompt(style: BulletStyle): string {
  const styleMap: Record<BulletStyle, string> = {
    'minimal': 'Use bullets and lists sparingly, only when essential.',
    'frequent': 'Use bullets and lists frequently to break up content.',
    'numbered-steps': 'Use numbered step lists for processes and instructions.',
    'checklists': 'Format lists as actionable checklists where appropriate.',
    'do-dont': 'Use "Do/Don\'t" comparison lists where helpful.',
    'pros-cons': 'Use pros/cons comparison lists where relevant.',
    'key-takeaways': 'Include key takeaway summary lists at the end of sections.',
    'action-steps': 'Include action step lists with clear implementation guidance.',
  };
  return styleMap[style] || styleMap['frequent'];
}

function getAudiencePrompt(audience: Audience): string {
  const audienceMap: Record<Audience, string> = {
    'general': 'Target a general audience with average background knowledge.',
    'beginners': 'Target complete beginners with no prior knowledge of the topic.',
    'seniors': 'Target older readers with clear explanations and larger concepts.',
    'parents': 'Target busy parents who need practical, actionable advice.',
    'business-owners': 'Target business owners who need strategic, ROI-focused content.',
    'professionals': 'Target working professionals who need career-focused advice.',
    'students': 'Target students who need educational, study-friendly content.',
    'custom': 'Write for the specific custom audience noted in the project.',
  };
  return audienceMap[audience] || audienceMap['general'];
}

function getBookTypePrompt(bookType: string): string {
  const bookTypeMap: Record<string, string> = {
    'nonfiction-guide': 'a comprehensive nonfiction guide',
    'how-to-manual': 'a practical how-to manual with step-by-step instructions',
    'checklist-ebook': 'a checklist-focused ebook with actionable items',
    'workbook': 'an interactive workbook with exercises and activities',
    'training-manual': 'a structured training manual for educational purposes',
    'professional-report': 'a professional report format',
    'lead-magnet': 'a concise lead magnet ebook designed for opt-in incentives',
    'kdp-ebook': 'a KDP-optimized ebook for Amazon publishing',
    'senior-guide': 'a senior-friendly guide with larger concepts and clear explanations',
    'pet-care-guide': 'a pet care guide for pet owners',
    'business-guide': 'a business strategy guide',
    'custom': 'a custom formatted ebook',
  };
  return bookTypeMap[bookType] || bookTypeMap['nonfiction-guide'];
}

function getContentAdditionsPrompt(additions: ContentAddition[]): string {
  const prompts: string[] = [];
  const additionMap: Record<ContentAddition, string> = {
    'title-page': 'Create a title page',
    'copyright-page': 'Create a copyright/disclaimer page',
    'disclaimer': 'Include appropriate disclaimers',
    'table-of-contents': 'Create a table of contents structure',
    'introduction': 'Write an introduction chapter',
    'chapter-summaries': 'Add brief chapter summaries at the start of each chapter',
    'key-takeaways': 'Add key takeaway summary boxes after main sections',
    'action-steps': 'Include actionable step lists at the end of sections',
    'checklists': 'Add practical checklist sections where relevant',
    'examples': 'Include concrete examples to illustrate points',
    'warnings-cautions': 'Include warning or caution callout boxes for important notes',
    'faqs': 'Add a FAQ section addressing common questions',
    'glossary': 'Include a glossary of key terms',
    'resources-page': 'Add a resources/recommended reading page',
    'conclusion': 'Write a conclusion chapter',
    'about-author': 'Add an about the author page',
    'back-cover': 'Create back-cover marketing copy',
    'sales-page-summary': 'Create a sales page summary',
  };

  for (const addition of additions) {
    if (additionMap[addition]) {
      prompts.push(additionMap[addition]);
    }
  }

  return prompts.join('. Additionally, ');
}

function toPositiveNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

export function getChapterTargetWords(settings: RewriteSettings, outline: EbookOutline): number | null {
  const customWordsPerChapter = toPositiveNumber(settings.customWordsPerChapter);
  if (settings.chapterLength === 'custom' && customWordsPerChapter) {
    return Math.round(customWordsPerChapter);
  }

  const customBookWordCount = toPositiveNumber(settings.customWordCount);
  if (settings.targetLength === 'custom' && customBookWordCount) {
    const chapterCount = Math.max(1, Array.isArray(outline?.chapters) ? outline.chapters.length : 1);
    return Math.max(200, Math.round(customBookWordCount / chapterCount));
  }

  switch (settings.chapterLength) {
    case 'short':
      return 1500;
    case 'medium':
      return 2500;
    case 'long':
      return 4000;
    default:
      return null;
  }
}

function getTargetRange(targetWords: number | null): { minimumWords: number; maximumWords: number } | null {
  if (!targetWords) return null;

  return {
    minimumWords: Math.max(150, Math.floor(targetWords * 0.85)),
    maximumWords: Math.ceil(targetWords * 1.15),
  };
}

function getMaxTokensForTarget(targetWords: number | null): number {
  const fallbackTarget = targetWords || 2500;

  // Words to tokens is not exact. For JSON content blocks, allow generous headroom
  // so chapters do not silently stop at short summaries. Keep the default cap
  // within the common GPT-4o output allowance unless overridden by env.
  const configuredCap = Number(process.env.OPENAI_MAX_OUTPUT_TOKENS || 32000);
  const safeCap = Number.isFinite(configuredCap) && configuredCap > 0 ? configuredCap : 32000;

  return Math.min(
    safeCap,
    Math.max(12000, Math.ceil(fallbackTarget * 7) + 5000)
  );
}

function buildLengthInstructions(settings: RewriteSettings, outline: EbookOutline): string {
  const explicitChapterTarget = getChapterTargetWords(settings, outline);

  if (explicitChapterTarget) {
    const range = getTargetRange(explicitChapterTarget);
    const minimumWords = range?.minimumWords || explicitChapterTarget;
    const maximumWords = range?.maximumWords || explicitChapterTarget;

    return `HARD LENGTH REQUIREMENT: Write this chapter to approximately ${explicitChapterTarget} words. The accepted range is ${minimumWords}-${maximumWords} words. Do not produce a short summary. Do not stop at 500-700 words. If the source content is thin, expand it into a complete ebook chapter using practical explanations, examples, step-by-step guidance, cautions, checklists, and reader-friendly context. Avoid meaningless filler, but the chapter must still be developed to the requested length.`;
  }

  switch (settings.chapterLength) {
    case 'short':
      return 'Keep this chapter brief, around 1,500 words where the source material supports it.';
    case 'long':
      return 'Write a detailed chapter, around 4,000 words where the source material supports it.';
    default:
      break;
  }

  switch (settings.targetLength) {
    case 'shorten-25':
      return 'Shorten this chapter by approximately 25% while preserving all key information.';
    case 'expand-25':
      return 'Expand this chapter by approximately 25% with useful detail and examples.';
    case 'expand-50':
      return 'Expand this chapter by approximately 50% with thorough explanations and examples.';
    case 'double':
      return 'Aim to roughly double this chapter with comprehensive coverage, examples, and detailed explanations.';
    case 'full-professional':
      return 'Expand this into a full professional ebook chapter with comprehensive coverage, while avoiding filler.';
    default:
      return 'Maintain a similar length while improving quality.';
  }
}

function buildRewritePrompt(
  chapterTitle: string,
  originalContent: string,
  settings: RewriteSettings,
  outline: EbookOutline,
  bookTitle: string
): string {
  const bookType = getBookTypePrompt(settings.bookType);
  const tone = getTonePrompt(settings.writingTone);
  const paragraph = getParagraphPrompt(settings.paragraphStyle);
  const bullet = getBulletPrompt(settings.bulletStyle);
  const audience = settings.audience === 'custom' && settings.customAudience
    ? `Write for this specific audience: ${settings.customAudience}.`
    : getAudiencePrompt(settings.audience);

  const lengthInstruction = buildLengthInstructions(settings, outline);
  const targetWords = getChapterTargetWords(settings, outline);
  const targetRange = getTargetRange(targetWords);

  const depthInstruction = (() => {
    switch (settings.rewriteDepth) {
      case 'light-polish':
        return 'Lightly polish the existing content, fixing errors and improving flow.';
      case 'improve-readability':
        return 'Improve readability while keeping most original content.';
      case 'rewrite-professionally':
        return 'Rewrite professionally with significant improvements.';
      case 'expand-thin':
        return 'Expand thin content sections with more detail and examples.';
      case 'transform-premium':
        return 'Transform into premium ebook content with comprehensive coverage.';
      case 'ghostwrite-missing':
        return 'Ghostwrite new content for any missing or incomplete sections.';
      case 'rebuild-completely':
        return 'Rebuild the chapter completely with fresh professional content.';
      case 'preserve-closely':
        return 'Preserve the original content as closely as possible, making only essential updates.';
      default:
        return 'Rewrite the content professionally.';
    }
  })();

  return `You are a professional ebook writer. Rewrite the following chapter content for ${bookType} titled "${bookTitle}".

## Rewriting Guidelines:

### Tone and Style:
${tone}
${paragraph}
${bullet}

### Target Audience:
${audience}

### Length Guidelines:
${lengthInstruction}
${targetWords && targetRange ? `\nIMPORTANT: The final visible chapter text should be between ${targetRange.minimumWords} and ${targetRange.maximumWords} words. This is a real formatting target, not an example value. The application will count the words after generation.` : ''}

### Rewrite Depth:
${depthInstruction}

## Chapter: ${chapterTitle}

### Original Content:
${originalContent}

## Instructions:

1. Preserve the author's intent and key information
2. Improve writing quality, clarity, and flow
3. Use appropriate heading hierarchy
4. Include bullet points, numbered lists, or checklists where they add value
5. Avoid filler content, fake citations, or unsupported claims
6. Keep facts grounded in the source material
7. Format the output as clean, well-structured content
8. Return the result as JSON with chapter content blocks
9. Do not estimate or invent a wordCount value. The app calculates the real word count after generation.
10. If a target word count is provided, generate enough actual body content to meet it. Do not return a brief summary.

## Output Format:

Return a JSON object with this structure:
{
  "content": [
    {
      "type": "heading",
      "content": "Chapter Title",
      "level": 1
    },
    {
      "type": "paragraph",
      "content": "Paragraph text..."
    },
    {
      "type": "bullet-list",
      "items": [
        {"text": "Bullet item 1"},
        {"text": "Bullet item 2"}
      ]
    },
    {
      "type": "numbered-list",
      "items": [
        {"text": "Step 1"},
        {"text": "Step 2"}
      ]
    },
    {
      "type": "callout",
      "content": "Important note or tip...",
      "style": "tip"
    }
  ],
  "suggestions": ["Any suggestions for improvement"]
}

Rewrite the chapter now:`;
}

function buildOutlinePrompt(
  documentTitle: string,
  rawText: string,
  detectedSections: { title: string; content: string }[],
  settings: RewriteSettings
): string {
  const bookType = getBookTypePrompt(settings.bookType);
  const audience = getAudiencePrompt(settings.audience);

  const contentAdditions = settings.contentAdditions.length > 0
    ? getContentAdditionsPrompt(settings.contentAdditions)
    : '';

  const existingSections = detectedSections.map((s, i) =>
    `${i + 1}. ${s.title} (${s.content.split(/\s+/).length} words)`
  ).join('\n');

  return `You are a professional ebook outline designer. Create a comprehensive ebook outline for ${bookType}.

## Book Title: ${documentTitle}

## Original Content Summary:
${rawText.substring(0, 3000)}${rawText.length > 3000 ? '...' : ''}

## Detected Structure:
${existingSections || 'No clear structure detected'}

## Target Audience:
${audience}

## Additional Content:
${contentAdditions || 'Include standard front and back matter'}

## Task:

Create a professional ebook outline that:
1. Preserves the key content from the original document
2. Improves the structure for better readability
3. Adds any missing essential chapters
4. Includes appropriate front matter (title page, TOC, introduction)
5. Includes appropriate back matter (conclusion, resources if relevant)
6. Uses clear, compelling chapter titles
7. Organizes content logically

## Output Format:

Return a JSON object:
{
  "chapters": [
    {
      "id": "ch_001",
      "title": "Introduction",
      "summary": "Brief description of this chapter",
      "sections": [
        {"id": "sec_001", "title": "Section Title", "summary": "Section description"}
      ],
      "isLocked": false,
      "order": 1,
      "isIntroduction": true
    },
    {
      "id": "ch_002",
      "title": "Chapter Title",
      "summary": "Chapter description",
      "sections": [],
      "isLocked": false,
      "order": 2
    }
  ],
  "warnings": ["Any notes about the outline"]
}

Return only valid JSON:`;
}

function buildImagePromptPrompt(
  chapterTitle: string,
  chapterContent: string,
  bookTitle: string,
  imageStyle: string
): string {
  const styleDescriptions: Record<string, string> = {
    'soft-editorial': 'soft, warm editorial photography with gentle lighting and professional composition',
    'photorealistic': 'photorealistic, detailed photography with natural lighting and realistic proportions',
    'flat-illustration': 'clean, modern flat illustrations with bold colors and simple shapes',
    'minimal-line-art': 'minimalist line art illustrations with clean lines and subtle details',
    'professional-stock': 'professional stock photography style, polished and universally appealing',
    'custom': 'custom style as specified by the user',
  };

  const styleDesc = styleDescriptions[imageStyle] || styleDescriptions['soft-editorial'];

  return `You are an AI image prompt designer. Create image prompts for a professional ebook.

## Book Title: ${bookTitle}
## Chapter: ${chapterTitle}

## Chapter Content Summary:
${chapterContent.substring(0, 1500)}

## Image Style: ${styleDesc}

## Task:

Suggest 2-3 images that would enhance this chapter. Each image should:
1. Be directly relevant to the chapter content
2. Support the educational purpose
3. Be appropriate for the book's target audience
4. Match the overall style

## Output Format:

Return a JSON object:
{
  "suggestions": [
    {
      "id": "img_001",
      "prompt": "Detailed DALL-E prompt for the image...",
      "negativePrompt": "Elements to avoid in generation",
      "caption": "Image caption text",
      "altText": "Descriptive alt text for accessibility",
      "placement": "chapter-start",
      "reason": "Why this image is suggested for this chapter",
      "approved": false,
      "generated": false
    }
  ]
}

Each prompt should be 50-100 words, specific, and descriptive.
Include the exact subject, style, mood, composition, and any important details.

Return only valid JSON:`;
}

const openaiCall = async (prompt: string, maxTokens: number = 4000): Promise<string> => {
  const apiKey = getOpenAIKey();

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o', // the newest OpenAI model
      messages: [
        {
          role: 'system',
          content: 'You are a professional ebook writer and editor. You always respond with valid JSON when asked for structured output. You write clear, engaging content that avoids filler and maintains professional standards.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
};

export async function generateAOutline(
  documentTitle: string,
  rawText: string,
  detectedSections: { title: string; content: string }[],
  settings: RewriteSettings
): Promise<OpenAIGenerateOutlineResult> {
  const prompt = buildOutlinePrompt(documentTitle, rawText, detectedSections, settings);
  const response = await openaiCall(prompt, 6000);

  try {
    // Extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    const result = JSON.parse(jsonMatch[0]);
    return result;
  } catch (e) {
    console.error('Failed to parse outline response:', e);
    throw new Error('Failed to parse AI outline response');
  }
}

function contentBlocksToPlainText(content: unknown): string {
  if (!Array.isArray(content)) return '';

  return content.map((block: any) => {
    if (!block) return '';

    if (Array.isArray(block.items) && block.items.length > 0) {
      return block.items.map((item: any) => item?.text || '').join('\n');
    }

    return block.content || '';
  }).filter(Boolean).join('\n\n');
}

function buildExpansionPrompt(params: {
  chapterTitle: string;
  bookTitle: string;
  originalContent: string;
  currentContent: ChapterContent[];
  currentWordCount: number;
  targetWords: number;
  settings: RewriteSettings;
  outline: EbookOutline;
}): string {
  const range = getTargetRange(params.targetWords);
  const currentText = contentBlocksToPlainText(params.currentContent);
  const lengthInstruction = buildLengthInstructions(params.settings, params.outline);

  return `You are revising an ebook chapter that is too short. Expand it properly while preserving its existing structure and meaning.

## Book Title: ${params.bookTitle}
## Chapter: ${params.chapterTitle}

## Current Problem:
The chapter currently has ${params.currentWordCount} real words, but the target is approximately ${params.targetWords} words${range ? ` with an accepted range of ${range.minimumWords}-${range.maximumWords} words` : ''}.

## Length Requirement:
${lengthInstruction}

## Original Source Content:
${params.originalContent}

## Current Draft To Expand:
${currentText}

## Instructions:
1. Expand the current draft into a complete ebook chapter.
2. Keep the useful text already written.
3. Add practical explanations, examples, subheadings, checklists, cautions, and reader guidance where useful.
4. Do not add fake citations, fake statistics, or unsupported claims.
5. Return only valid JSON using the same content block structure.
6. Do not include a wordCount value.

Return this JSON structure:
{
  "content": [
    {"type": "heading", "content": "Chapter Title", "level": 1},
    {"type": "paragraph", "content": "Paragraph text..."}
  ],
  "suggestions": []
}`;
}


function buildContinuationPrompt(params: {
  chapterTitle: string;
  bookTitle: string;
  originalContent: string;
  existingContent: ChapterContent[];
  currentWordCount: number;
  targetWords: number;
  remainingWords: number;
  settings: RewriteSettings;
  outline: EbookOutline;
}): string {
  const range = getTargetRange(params.targetWords);
  const existingText = contentBlocksToPlainText(params.existingContent);
  const remainingTarget = Math.max(300, Math.ceil(params.remainingWords));

  return `You are continuing and expanding an ebook chapter that is still too short.

## Book Title
${params.bookTitle}

## Chapter
${params.chapterTitle}

## Current Word Count
${params.currentWordCount} real words

## Target Word Count
${params.targetWords} words${range ? `, accepted range ${range.minimumWords}-${range.maximumWords} words` : ''}

## Required Additional Length
Write approximately ${remainingTarget} additional words of NEW chapter content.

## Important
Do not rewrite the existing draft. Do not summarise it. Do not repeat the same introduction. Continue the chapter by adding useful new sections, explanations, examples, cautions, checklists, and practical guidance that naturally extend the current draft.

## Original Source Content
${params.originalContent}

## Existing Draft
${existingText}

Return only valid JSON in this structure:
{
  "content": [
    {"type": "heading", "content": "Additional section heading", "level": 2},
    {"type": "paragraph", "content": "New paragraph text..."}
  ],
  "suggestions": []
}`;
}

function ensureContentBlocks(value: unknown): ChapterContent[] {
  return Array.isArray(value) ? value as ChapterContent[] : [];
}

function mergeChapterContent(existing: ChapterContent[], additional: ChapterContent[]): ChapterContent[] {
  const normalisedExisting = ensureContentBlocks(existing);
  const normalisedAdditional = ensureContentBlocks(additional);
  const seen = new Set<string>();

  for (const block of normalisedExisting) {
    if (!block) continue;
    if (typeof (block as any).content === 'string') {
      seen.add((block as any).content.trim().toLowerCase());
    }
  }

  const uniqueAdditional = normalisedAdditional.filter((block: any) => {
    if (!block) return false;
    const text = typeof block.content === 'string'
      ? block.content.trim().toLowerCase()
      : Array.isArray(block.items)
        ? block.items.map((item: any) => item?.text || '').join(' ').trim().toLowerCase()
        : '';

    if (!text) return true;
    if (seen.has(text)) return false;
    seen.add(text);
    return true;
  });

  return [...normalisedExisting, ...uniqueAdditional];
}

function parseRewriteJson(response: string): any {
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in response');
  }

  return JSON.parse(jsonMatch[0]);
}

export async function rewriteChapterWithAI(
  chapter: Chapter,
  settings: RewriteSettings,
  outline: EbookOutline,
  bookTitle: string
): Promise<OpenAIRewriteChapterResult> {
  const originalContent = chapter.originalContent || contentBlocksToPlainText(chapter.content);
  const prompt = buildRewritePrompt(chapter.title, originalContent, settings, outline, bookTitle);
  const targetWords = getChapterTargetWords(settings, outline);
  const targetRange = getTargetRange(targetWords);
  const response = await openaiCall(prompt, getMaxTokensForTarget(targetWords));

  try {
    let result = parseRewriteJson(response);
    result.content = ensureContentBlocks(result.content);
    let actualWordCount = countWordsInContentBlocks(result.content);
    const lengthWarnings: string[] = [];

    // If the first answer is too short, make a full expansion attempt.
    if (
      targetWords &&
      targetRange &&
      actualWordCount > 0 &&
      actualWordCount < targetRange.minimumWords
    ) {
      const expansionPrompt = buildExpansionPrompt({
        chapterTitle: chapter.title,
        bookTitle,
        originalContent,
        currentContent: result.content,
        currentWordCount: actualWordCount,
        targetWords,
        settings,
        outline,
      });

      const expandedResponse = await openaiCall(expansionPrompt, getMaxTokensForTarget(targetWords));
      const expandedResult = parseRewriteJson(expandedResponse);
      expandedResult.content = ensureContentBlocks(expandedResult.content);
      const expandedWordCount = countWordsInContentBlocks(expandedResult.content);

      // Keep whichever response is longer. Never throw away useful generated text.
      if (expandedWordCount >= actualWordCount) {
        result = expandedResult;
        actualWordCount = expandedWordCount;
      }
    }

    // Robust length guard: if the chapter is still too short, ask for NEW continuation
    // blocks and append them. This avoids the common model behaviour of returning
    // another short rewrite instead of reaching the requested length.
    if (targetWords && targetRange && actualWordCount > 0) {
      const maxContinuationPasses = Number(process.env.OPENAI_LENGTH_EXPANSION_PASSES || 3);
      const passes = Number.isFinite(maxContinuationPasses) && maxContinuationPasses > 0
        ? Math.min(5, Math.floor(maxContinuationPasses))
        : 3;

      for (let pass = 0; pass < passes && actualWordCount < targetRange.minimumWords; pass++) {
        const remainingWords = targetWords - actualWordCount;
        if (remainingWords < 150) break;

        const continuationPrompt = buildContinuationPrompt({
          chapterTitle: chapter.title,
          bookTitle,
          originalContent,
          existingContent: result.content,
          currentWordCount: actualWordCount,
          targetWords,
          remainingWords,
          settings,
          outline,
        });

        const continuationResponse = await openaiCall(
          continuationPrompt,
          getMaxTokensForTarget(Math.max(remainingWords, 800))
        );
        const continuationResult = parseRewriteJson(continuationResponse);
        const continuationContent = ensureContentBlocks(continuationResult.content);

        if (continuationContent.length === 0) break;

        const mergedContent = mergeChapterContent(result.content, continuationContent);
        const mergedWordCount = countWordsInContentBlocks(mergedContent);

        if (mergedWordCount <= actualWordCount) break;

        result = {
          ...result,
          content: mergedContent,
          suggestions: [
            ...(Array.isArray(result.suggestions) ? result.suggestions : []),
            ...(Array.isArray(continuationResult.suggestions) ? continuationResult.suggestions : []),
          ],
        };
        actualWordCount = mergedWordCount;
      }
    }

    if (targetWords && targetRange && actualWordCount < targetRange.minimumWords) {
      lengthWarnings.push(`Generated chapter is ${actualWordCount} words, below the requested ${targetWords}-word target. The app preserved the chapter and added as much expansion as the model returned.`);
    }

    return {
      ...result,
      content: ensureContentBlocks(result.content),
      wordCount: actualWordCount,
      suggestions: [
        ...(Array.isArray(result.suggestions) ? result.suggestions : []),
        ...lengthWarnings,
      ],
    };
  } catch (e) {
    console.error('Failed to parse rewrite response:', e);
    throw new Error('Failed to parse AI rewrite response');
  }
}

const DEFAULT_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';

function isGptImageModel(model: string): boolean {
  return model.startsWith('gpt-image-');
}

function buildImageGenerationPayload(prompt: string): Record<string, unknown> {
  const model = DEFAULT_IMAGE_MODEL;
  const payload: Record<string, unknown> = {
    model,
    prompt,
    n: 1,
    size: '1024x1024',
  };

  if (isGptImageModel(model)) {
    // GPT image models always return base64 image data and do not support
    // response_format. Supplying response_format causes a 400/500 error such
    // as: Unknown parameter: 'response_format'.
    payload.output_format = 'png';

    const quality = process.env.OPENAI_IMAGE_QUALITY;
    if (quality && ['low', 'medium', 'high', 'auto'].includes(quality)) {
      payload.quality = quality;
    }
  } else {
    // DALL-E 2/3 are the models that support response_format.
    payload.response_format = 'b64_json';

    if (model === 'dall-e-3') {
      payload.quality = 'standard';
    }
  }

  return payload;
}

async function readOpenAIError(response: Response): Promise<string> {
  const bodyText = await response.text().catch(() => '');

  if (!bodyText) {
    return `OpenAI Image API error: ${response.status}`;
  }

  try {
    const errorBody = JSON.parse(bodyText);
    return errorBody.error?.message || bodyText;
  } catch {
    return bodyText;
  }
}

async function imageUrlToBase64(url: string): Promise<string> {
  const imageResponse = await fetch(url);

  if (!imageResponse.ok) {
    throw new Error(`Failed to download generated image: ${imageResponse.status}`);
  }

  const arrayBuffer = await imageResponse.arrayBuffer();
  return Buffer.from(arrayBuffer).toString('base64');
}

export async function generateImageUrl(prompt: string, style: string): Promise<string> {
  const apiKey = getOpenAIKey();

  const styleEnhancements: Record<string, string> = {
    'soft-editorial': ', soft warm lighting, gentle editorial photography, professional composition',
    'photorealistic': ', photorealistic, highly detailed, natural lighting, 8k quality',
    'flat-illustration': ', flat illustration, modern vector style, bold colors, clean simple design',
    'minimal-line-art': ', minimal line art, clean simple lines, subtle artistic details, elegant',
    'professional-stock': ', professional stock photography, polished composition, universal appeal',
    'custom': '',
  };

  const enhancedPrompt = prompt + (styleEnhancements[style] || '');
  const payload = buildImageGenerationPayload(enhancedPrompt);

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await readOpenAIError(response));
  }

  const data = await response.json();
  const image = data.data?.[0];

  if (image?.b64_json) {
    return image.b64_json;
  }

  if (image?.url) {
    return imageUrlToBase64(image.url);
  }

  throw new Error('OpenAI Image API did not return image data.');
}

export async function generateImageSuggestions(
  chapterTitle: string,
  chapterContent: string,
  bookTitle: string,
  imageStyle: string
): Promise<ImageSuggestion[]> {
  const prompt = buildImagePromptPrompt(chapterTitle, chapterContent, bookTitle, imageStyle);
  const response = await openaiCall(prompt, 3000);

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    const result = JSON.parse(jsonMatch[0]);
    return result.suggestions || [];
  } catch (e) {
    console.error('Failed to parse image suggestions:', e);
    return [];
  }
}

export { openaiCall, getOpenAIKey };
