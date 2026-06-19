export interface EbookProject {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'uploaded' | 'outlining' | 'rewriting' | 'images' | 'preview' | 'exporting' | 'complete';
  originalDocument: UploadedDocument | null;
  outline: EbookOutline;
  settings: RewriteSettings;
  chapters: Chapter[];
  images: EbookImage[];
  formatting: FormattingSettings;
  metadata: ProjectMetadata;
}

export interface UploadedDocument {
  filename: string;
  rawText: string;
  detectedSections: DetectedSection[];
  detectedTitle: string;
  detectedAuthor: string;
  detectedSubtitle: string;
  warnings: string[];
  stats: DocumentStats;
}

export interface DetectedSection {
  title: string;
  content: string;
  level: number;
  wordCount: number;
  startIndex: number;
  endIndex: number;
}

export interface DocumentStats {
  totalWords: number;
  totalCharacters: number;
  totalParagraphs: number;
  estimatedReadingTime: number;
  headingCount: number;
  listCount: number;
}

export interface EbookOutline {
  chapters: OutlineChapter[];
  includeTitlePage: boolean;
  includeCopyright: boolean;
  includeTableOfContents: boolean;
  includeIntroduction: boolean;
  includeConclusion: boolean;
  includeAboutAuthor: boolean;
  includeResources: boolean;
  includeGlossary: boolean;
  includeFAQs: boolean;
}

export interface OutlineChapter {
  id: string;
  title: string;
  summary: string;
  sections: OutlineSection[];
  isLocked: boolean;
  order: number;
  isIntroduction?: boolean;
  isConclusion?: boolean;
  isBonusSection?: boolean;
  bonusType?: 'checklist' | 'glossary' | 'resources' | 'faq' | 'action-plan' | 'workbook' | 'summary';
}

export interface OutlineSection {
  id: string;
  title: string;
  summary: string;
  keyPoints: string[];
  order: number;
}

export interface RewriteSettings {
  bookType: BookType;
  targetLength: TargetLength;
  chapterLength: ChapterLength;
  writingTone: WritingTone;
  audience: Audience;
  paragraphStyle: ParagraphStyle;
  bulletStyle: BulletStyle;
  rewriteDepth: RewriteDepth;
  contentAdditions: ContentAddition[];
  customWordCount?: number;
  customWordsPerChapter?: number;
  customAudience?: string;
}

export type BookType =
  | 'nonfiction-guide'
  | 'how-to-manual'
  | 'checklist-ebook'
  | 'workbook'
  | 'training-manual'
  | 'professional-report'
  | 'lead-magnet'
  | 'kdp-ebook'
  | 'senior-guide'
  | 'pet-care-guide'
  | 'business-guide'
  | 'custom';

export type TargetLength =
  | 'keep-similar'
  | 'shorten-25'
  | 'expand-25'
  | 'expand-50'
  | 'double'
  | 'full-professional'
  | 'custom';

export type ChapterLength =
  | 'short'
  | 'medium'
  | 'long'
  | 'custom';

export type WritingTone =
  | 'professional'
  | 'friendly'
  | 'conversational'
  | 'warm-reassuring'
  | 'authoritative'
  | 'expert-simple'
  | 'premium-consultant'
  | 'plain-english'
  | 'marketing-persuasive'
  | 'kdp-nonfiction';

export type Audience =
  | 'general'
  | 'beginners'
  | 'seniors'
  | 'parents'
  | 'business-owners'
  | 'professionals'
  | 'students'
  | 'custom';

export type ParagraphStyle =
  | 'short-modern'
  | 'balanced'
  | 'detailed-explanatory'
  | 'very-simple'
  | 'formal-publishing'
  | 'blog-style'
  | 'premium-ebook';

export type BulletStyle =
  | 'minimal'
  | 'frequent'
  | 'numbered-steps'
  | 'checklists'
  | 'do-dont'
  | 'pros-cons'
  | 'key-takeaways'
  | 'action-steps';

export type RewriteDepth =
  | 'light-polish'
  | 'improve-readability'
  | 'rewrite-professionally'
  | 'expand-thin'
  | 'transform-premium'
  | 'ghostwrite-missing'
  | 'rebuild-completely'
  | 'preserve-closely';

export type ContentAddition =
  | 'title-page'
  | 'copyright-page'
  | 'disclaimer'
  | 'table-of-contents'
  | 'introduction'
  | 'chapter-summaries'
  | 'key-takeaways'
  | 'action-steps'
  | 'checklists'
  | 'examples'
  | 'warnings-cautions'
  | 'faqs'
  | 'glossary'
  | 'resources-page'
  | 'conclusion'
  | 'about-author'
  | 'back-cover'
  | 'sales-page-summary';

export interface Chapter {
  id: string;
  title: string;
  content: ChapterContent[];
  originalContent: string;
  wordCount: number;
  status: 'pending' | 'rewriting' | 'rewritten' | 'edited' | 'complete';
  images: ImagePlacement[];
  imageSuggestions: ImageSuggestion[];
  notes: string;
  lastEdited: string;
}

export interface ChapterContent {
  id: string;
  type: ContentType;
  content: string;
  style?: ContentStyle;
  level?: number;
  items?: ContentItem[];
  imageId?: string;
  caption?: string;
  altText?: string;
}

export type ContentType =
  | 'heading'
  | 'paragraph'
  | 'bullet-list'
  | 'numbered-list'
  | 'checklist'
  | 'callout'
  | 'image'
  | 'page-break'
  | 'quote'
  | 'table';

export interface ContentItem {
  id: string;
  text: string;
  checked?: boolean;
}

export type ContentStyle =
  | 'normal'
  | 'bold'
  | 'italic'
  | 'warning'
  | 'tip'
  | 'important'
  | 'key-takeaway';

export interface ImagePlacement {
  id: string;
  imageId: string;
  placement: ImagePlacementType;
  caption: string;
  altText: string;
  order: number;
}

export type ImagePlacementType =
  | 'chapter-start'
  | 'after-first-section'
  | 'between-sections'
  | 'before-checklist'
  | 'after-summary'
  | 'custom';

export interface ImageSuggestion {
  id: string;
  prompt: string;
  negativePrompt?: string;
  caption: string;
  altText: string;
  placement: ImagePlacementType;
  reason: string;
  approved: boolean;
  generated: boolean;
}

export interface EbookImage {
  id: string;
  prompt: string;
  generatedUrl?: string;
  base64Data?: string;
  storagePath?: string;
  previewUrl?: string;
  storageUrl?: string;
  storageProvider?: 'local' | 'supabase';
  mimeType?: string;
  extension?: string;
  storageWarning?: string;
  style: ImageStyle;
  aspectRatio: ImageAspectRatio;
  caption: string;
  altText: string;
  placement: ImagePlacementType;
  chapterId?: string;
  isCover: boolean;
  generatedAt?: string;
}

export type ImageStyle =
  | 'soft-editorial'
  | 'photorealistic'
  | 'flat-illustration'
  | 'minimal-line-art'
  | 'professional-stock'
  | 'custom';

export type ImageAspectRatio =
  | '1:1'
  | '16:9'
  | '4:3'
  | '3:2'
  | '2:3';

export interface ImageSettings {
  mode: ImageMode;
  count: ImageCount;
  aspectRatio: ImageAspectRatio;
  style: ImageStyle;
  quality: 'standard' | 'hd';
  captionsEnabled: boolean;
  altTextEnabled: boolean;
  consistentStyle: boolean;
  customStylePrompt?: string;
}

export type ImageMode =
  | 'none'
  | 'cover-only'
  | 'one-per-chapter'
  | 'multiple-per-chapter'
  | 'section-dividers'
  | 'workbook-illustrations';

export type ImageCount =
  | 'auto'
  | 'cover'
  | 'one-per-chapter'
  | 'two-per-chapter'
  | 'three-per-chapter'
  | 'custom';

export interface FormattingSettings {
  format: EbookFormat;
  pageSize: PageSize;
  margins: MarginStyle;
  fontStyle: FontStyle;
  includeTitlePage: boolean;
  includeSubtitle: boolean;
  includeAuthor: boolean;
  includeCopyright: boolean;
  includeTableOfContents: boolean;
  includeChapterTitlePages: boolean;
  includePageNumbers: boolean;
  includeHeaders: boolean;
  includeFooters: boolean;
  imageCaptions: boolean;
  imageAltText: boolean;
  calloutBoxes: boolean;
  checklistBoxes: boolean;
  keyTakeawayBoxes: boolean;
  summaryBoxes: boolean;
}

export type EbookFormat = 'pdf-ebook' | 'print-pdf' | 'kindle' | 'epub-ready' | 'lead-magnet-pdf' | 'workbook' | 'report';

export type PageSize = 'a4' | 'us-letter' | '6x9' | '8.5x11' | 'digital-pdf';

export type MarginStyle = 'narrow' | 'standard' | 'wide' | 'print-safe';

export type FontStyle = 'clean-professional' | 'modern-sans' | 'classic-book' | 'senior-friendly' | 'premium-consultant' | 'workbook';

export interface ProjectMetadata {
  exportHistory: ExportRecord[];
  lastBackup?: string;
  sampleMode?: boolean;
  totalRewriteCost?: number;
  totalImageCost?: number;
  totalTokensUsed?: number;
}

export interface ExportRecord {
  id: string;
  type: 'docx' | 'pdf' | 'epub' | 'chapter-docx' | 'chapter-pdf' | 'chapter-html' | 'project-json' | 'images-zip';
  exportedAt: string;
  chapterId?: string;
  fileSize?: number;
}

export interface PublishingCheck {
  id: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  chapterId?: string;
  field?: string;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  pageSize: PageSize;
  margins: MarginStyle;
  fontStyle: FontStyle;
  headingStyle: string;
  paragraphStyle: string;
  imageRules: string;
  calloutStyle: string;
  tocStyle: string;
  footerStyle: string;
}
