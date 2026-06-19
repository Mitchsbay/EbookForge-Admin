export type CountableContentBlock = {
  type?: string;
  content?: string;
  items?: Array<{ text?: string }>;
  caption?: string;
  altText?: string;
};

const WORD_REGEX = /[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu;

export function countWordsInText(value: unknown): number {
  if (typeof value !== 'string') return 0;

  const cleaned = value
    .replace(/<[^>]*>/g, ' ')
    .replace(/[`*_#>\-[\]()[\]{}|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return 0;

  return cleaned.match(WORD_REGEX)?.length || 0;
}

export function countWordsInContentBlocks(content: unknown): number {
  if (!Array.isArray(content)) return 0;

  return content.reduce((total, block) => {
    const current = block as CountableContentBlock;

    if (!current || current.type === 'page-break') {
      return total;
    }

    let count = 0;

    if (current.type !== 'image') {
      count += countWordsInText(current.content);
    }

    if (Array.isArray(current.items)) {
      count += current.items.reduce((itemTotal, item) => itemTotal + countWordsInText(item?.text), 0);
    }

    // Captions are visible words in the final ebook, so include them.
    if (current.caption) {
      count += countWordsInText(current.caption);
    }

    return total + count;
  }, 0);
}

export function countWordsInChapter(chapter: { content?: unknown; originalContent?: unknown; wordCount?: unknown } | null | undefined): number {
  if (!chapter) return 0;

  const contentCount = countWordsInContentBlocks(chapter.content);
  if (contentCount > 0) return contentCount;

  const originalCount = countWordsInText(chapter.originalContent);
  if (originalCount > 0) return originalCount;

  return typeof chapter.wordCount === 'number' && Number.isFinite(chapter.wordCount)
    ? chapter.wordCount
    : 0;
}

export function normaliseChapterWordCounts<T extends { content?: unknown; originalContent?: unknown; wordCount?: number }>(chapters: T[] | undefined | null): T[] {
  if (!Array.isArray(chapters)) return [];

  return chapters.map((chapter) => ({
    ...chapter,
    wordCount: countWordsInChapter(chapter),
  }));
}
