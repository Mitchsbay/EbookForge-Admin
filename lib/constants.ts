import { Template, RewriteSettings, FormattingSettings, ImageSettings, EbookOutline } from './types';

export const BOOK_TYPE_OPTIONS = [
  { value: 'nonfiction-guide', label: 'Nonfiction Guide' },
  { value: 'how-to-manual', label: 'How-to Manual' },
  { value: 'checklist-ebook', label: 'Checklist Ebook' },
  { value: 'workbook', label: 'Workbook' },
  { value: 'training-manual', label: 'Training Manual' },
  { value: 'professional-report', label: 'Professional Report' },
  { value: 'lead-magnet', label: 'Lead Magnet' },
  { value: 'kdp-ebook', label: 'KDP Nonfiction Ebook' },
  { value: 'senior-guide', label: 'Senior Guide' },
  { value: 'pet-care-guide', label: 'Pet Care Guide' },
  { value: 'business-guide', label: 'Business Guide' },
  { value: 'custom', label: 'Custom' },
];

export const TARGET_LENGTH_OPTIONS = [
  { value: 'keep-similar', label: 'Keep Similar Length' },
  { value: 'shorten-25', label: 'Shorten by 25%' },
  { value: 'expand-25', label: 'Expand by 25%' },
  { value: 'expand-50', label: 'Expand by 50%' },
  { value: 'double', label: 'Double the Length' },
  { value: 'full-professional', label: 'Full Professional Ebook' },
  { value: 'custom', label: 'Custom Word Count' },
];

export const CHAPTER_LENGTH_OPTIONS = [
  { value: 'short', label: 'Short Chapters (~1500 words)' },
  { value: 'medium', label: 'Medium Chapters (~2500 words)' },
  { value: 'long', label: 'Long Detailed Chapters (~4000 words)' },
  { value: 'custom', label: 'Custom Words per Chapter' },
];

export const WRITING_TONE_OPTIONS = [
  { value: 'professional', label: 'Professional' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'conversational', label: 'Conversational' },
  { value: 'warm-reassuring', label: 'Warm and Reassuring' },
  { value: 'authoritative', label: 'Authoritative' },
  { value: 'expert-simple', label: 'Expert but Simple' },
  { value: 'premium-consultant', label: 'Premium Consultant Style' },
  { value: 'plain-english', label: 'Plain English' },
  { value: 'marketing-persuasive', label: 'Marketing/Persuasive' },
  { value: 'kdp-nonfiction', label: 'KDP Nonfiction Style' },
];

export const AUDIENCE_OPTIONS = [
  { value: 'general', label: 'General Reader' },
  { value: 'beginners', label: 'Beginners' },
  { value: 'seniors', label: 'Seniors' },
  { value: 'parents', label: 'Parents' },
  { value: 'business-owners', label: 'Business Owners' },
  { value: 'professionals', label: 'Professionals' },
  { value: 'students', label: 'Students' },
  { value: 'custom', label: 'Custom Audience' },
];

export const PARAGRAPH_STYLE_OPTIONS = [
  { value: 'short-modern', label: 'Short Modern Paragraphs' },
  { value: 'balanced', label: 'Balanced Paragraphs' },
  { value: 'detailed-explanatory', label: 'Detailed Explanatory Paragraphs' },
  { value: 'very-simple', label: 'Very Simple Plain English' },
  { value: 'formal-publishing', label: 'Formal Publishing Style' },
  { value: 'blog-style', label: 'Friendly Blog-Style' },
  { value: 'premium-ebook', label: 'Premium Ebook Style' },
];

export const BULLET_STYLE_OPTIONS = [
  { value: 'minimal', label: 'Minimal Bullets' },
  { value: 'frequent', label: 'Frequent Bullets' },
  { value: 'numbered-steps', label: 'Numbered Steps' },
  { value: 'checklists', label: 'Checklists' },
  { value: 'do-dont', label: 'Do/Don\'t Lists' },
  { value: 'pros-cons', label: 'Pros/Cons Lists' },
  { value: 'key-takeaways', label: 'Key Takeaway Lists' },
  { value: 'action-steps', label: 'Action-Step Lists' },
];

export const REWRITE_DEPTH_OPTIONS = [
  { value: 'light-polish', label: 'Light Polish' },
  { value: 'improve-readability', label: 'Improve Readability' },
  { value: 'rewrite-professionally', label: 'Rewrite Professionally' },
  { value: 'expand-thin', label: 'Expand Thin Content' },
  { value: 'transform-premium', label: 'Transform into Premium Ebook' },
  { value: 'ghostwrite-missing', label: 'Ghostwrite Missing Sections' },
  { value: 'rebuild-completely', label: 'Rebuild Chapter Completely' },
  { value: 'preserve-closely', label: 'Preserve Original as Closely as Possible' },
];

export const CONTENT_ADDITION_OPTIONS = [
  { value: 'title-page', label: 'Title Page' },
  { value: 'copyright-page', label: 'Copyright Page' },
  { value: 'disclaimer', label: 'Disclaimer' },
  { value: 'table-of-contents', label: 'Table of Contents' },
  { value: 'introduction', label: 'Introduction' },
  { value: 'chapter-summaries', label: 'Chapter Summaries' },
  { value: 'key-takeaways', label: 'Key Takeaways' },
  { value: 'action-steps', label: 'Action Steps' },
  { value: 'checklists', label: 'Checklists' },
  { value: 'examples', label: 'Examples' },
  { value: 'warnings-cautions', label: 'Warnings/Cautions' },
  { value: 'faqs', label: 'FAQs' },
  { value: 'glossary', label: 'Glossary' },
  { value: 'resources-page', label: 'Resources Page' },
  { value: 'conclusion', label: 'Conclusion' },
  { value: 'about-author', label: 'About the Author' },
  { value: 'back-cover', label: 'Back-Cover Description' },
  { value: 'sales-page-summary', label: 'Sales Page Summary' },
];

export const PAGE_SIZE_OPTIONS = [
  { value: 'a4', label: 'A4 (210 x 297 mm)', dimensions: { width: 210, height: 297 } },
  { value: 'us-letter', label: 'US Letter (8.5 x 11 in)', dimensions: { width: 216, height: 279 } },
  { value: '6x9', label: '6 x 9 Paperback', dimensions: { width: 152, height: 229 } },
  { value: '8.5x11', label: '8.5 x 11 Workbook', dimensions: { width: 216, height: 279 } },
  { value: 'digital-pdf', label: 'Digital PDF Ebook', dimensions: { width: 150, height: 200 } },
];

export const MARGIN_OPTIONS = [
  { value: 'narrow', label: 'Narrow (0.5 in)', margins: { top: 13, bottom: 13, left: 13, right: 13 } },
  { value: 'standard', label: 'Standard (1 in)', margins: { top: 25, bottom: 25, left: 25, right: 25 } },
  { value: 'wide', label: 'Wide (1.5 in)', margins: { top: 38, bottom: 38, left: 38, right: 38 } },
  { value: 'print-safe', label: 'Print-Safe', margins: { top: 25, bottom: 20, left: 20, right: 15 } },
];

export const FONT_STYLE_OPTIONS = [
  { value: 'clean-professional', label: 'Clean Professional', font: 'Georgia, serif' },
  { value: 'modern-sans', label: 'Modern Sans-Serif', font: 'Open Sans, sans-serif' },
  { value: 'classic-book', label: 'Classic Book Style', font: 'Palatino, serif' },
  { value: 'senior-friendly', label: 'Large Readable Senior-Friendly', font: 'Arial, sans-serif' },
  { value: 'premium-consultant', label: 'Premium Consultant', font: 'Lato, sans-serif' },
  { value: 'workbook', label: 'Workbook/Checklist Style', font: 'Helvetica, sans-serif' },
];

export const IMAGE_STYLE_OPTIONS = [
  { value: 'soft-editorial', label: 'Soft Editorial Images' },
  { value: 'photorealistic', label: 'Photorealistic Images' },
  { value: 'flat-illustration', label: 'Flat Illustrations' },
  { value: 'minimal-line-art', label: 'Minimal Line Art' },
  { value: 'professional-stock', label: 'Professional Stock-Style' },
  { value: 'custom', label: 'Custom Style' },
];

export const IMAGE_ASPECT_RATIO_OPTIONS = [
  { value: '1:1', label: 'Square (1:1)' },
  { value: '16:9', label: 'Landscape (16:9)' },
  { value: '4:3', label: 'Standard (4:3)' },
  { value: '3:2', label: 'Photo (3:2)' },
  { value: '2:3', label: 'Portrait (2:3)' },
];

export const IMAGE_MODE_OPTIONS = [
  { value: 'none', label: 'No Images' },
  { value: 'cover-only', label: 'Cover/Hero Image Only' },
  { value: 'one-per-chapter', label: 'One Image Per Chapter' },
  { value: 'multiple-per-chapter', label: 'Multiple Images Per Chapter' },
  { value: 'section-dividers', label: 'Section Divider Images' },
  { value: 'workbook-illustrations', label: 'Workbook/Checklist Illustrations' },
];

export const IMAGE_PLACEMENT_OPTIONS = [
  { value: 'chapter-start', label: 'Beginning of Chapter' },
  { value: 'after-first-section', label: 'After First Section' },
  { value: 'between-sections', label: 'Between Major Sections' },
  { value: 'before-checklist', label: 'Before Checklist' },
  { value: 'after-summary', label: 'After Summary' },
  { value: 'custom', label: 'Custom Marker Location' },
];

export const EBOOK_FORMAT_OPTIONS = [
  { value: 'pdf-ebook', label: 'PDF Ebook' },
  { value: 'print-pdf', label: 'Print-Style PDF' },
  { value: 'kindle', label: 'Kindle-Style Document' },
  { value: 'epub-ready', label: 'EPUB-Ready Format' },
  { value: 'lead-magnet-pdf', label: 'Lead Magnet PDF' },
  { value: 'workbook', label: 'Workbook Format' },
  { value: 'report', label: 'Professional Report Format' },
];

export const BUILT_IN_TEMPLATES: Template[] = [
  {
    id: 'clean-professional',
    name: 'Clean Professional Ebook',
    description: 'A clean, professional layout perfect for nonfiction guides and business books.',
    pageSize: '6x9',
    margins: 'standard',
    fontStyle: 'clean-professional',
    headingStyle: 'Bold, serif, chapter headings centered',
    paragraphStyle: 'Justified, 1.5 line spacing, first line indent',
    imageRules: 'Centered below headings with caption',
    calloutStyle: 'Rounded box with light background',
    tocStyle: 'Dot leaders, page numbers',
    footerStyle: 'Page numbers bottom center',
  },
  {
    id: 'premium-pdf-guide',
    name: 'Premium PDF Guide',
    description: 'High-end PDF layout for premium lead magnets and professional guides.',
    pageSize: 'us-letter',
    margins: 'wide',
    fontStyle: 'premium-consultant',
    headingStyle: 'Modern sans-serif with accent color',
    paragraphStyle: 'Generous spacing, ragged right',
    imageRules: 'Full-width when appropriate, margin images possible',
    calloutStyle: 'Gradient background with icon',
    tocStyle: 'Click-to-jump links',
    footerStyle: 'Page number with document title',
  },
  {
    id: 'kdp-simple',
    name: 'KDP Nonfiction Simple',
    description: 'Simple formatting optimized for Amazon KDP paperback publishing.',
    pageSize: '6x9',
    margins: 'print-safe',
    fontStyle: 'classic-book',
    headingStyle: 'Uppercase, centeredchapter headers',
    paragraphStyle: 'Justified, indented first line, no spacing between',
    imageRules: 'Centered, caption below',
    calloutStyle: 'Simple bordered box',
    tocStyle: 'Basic list with page numbers',
    footerStyle: 'Page number only',
  },
  {
    id: 'large-print-senior',
    name: 'Large Print Senior-Friendly',
    description: 'Easy-to-read format with large fonts and generous spacing.',
    pageSize: '8.5x11',
    margins: 'standard',
    fontStyle: 'senior-friendly',
    headingStyle: '14pt bold, clear hierarchy',
    paragraphStyle: '14pt, wide spacing, short lines',
    imageRules: 'Large images with clear captions',
    calloutStyle: 'High contrast bordered box',
    tocStyle: 'Large text, clear hierarchy',
    footerStyle: 'Large page numbers',
  },
  {
    id: 'workbook-checklist',
    name: 'Workbook and Checklist',
    description: 'Interactive format with checkboxes, spaces for notes, and activities.',
    pageSize: '8.5x11',
    margins: 'standard',
    fontStyle: 'workbook',
    headingStyle: 'Bold, clear section markers',
    paragraphStyle: 'Left-aligned, generous margins',
    imageRules: 'Instructional diagrams, icons',
    calloutStyle: 'Checkbox format',
    tocStyle: 'Activity list format',
    footerStyle: 'Page number with section name',
  },
  {
    id: 'modern-lead-magnet',
    name: 'Modern Lead Magnet',
    description: 'Quick-read format perfect for opt-in incentives and lead magnets.',
    pageSize: 'digital-pdf',
    margins: 'narrow',
    fontStyle: 'modern-sans',
    headingStyle: 'Bold sans-serif, left-aligned',
    paragraphStyle: 'Short paragraphs, mobile-friendly',
    imageRules: 'Minimal, cover only or section breaks',
    calloutStyle: 'Color-accented boxes',
    tocStyle: 'Simple numbered list',
    footerStyle: 'Branded footer',
  },
  {
    id: 'training-manual',
    name: 'Professional Training Manual',
    description: 'Structured format for courses, workshops, and training materials.',
    pageSize: 'a4',
    margins: 'standard',
    fontStyle: 'clean-professional',
    headingStyle: 'Numbered sections, clear hierarchy',
    paragraphStyle: 'Structured, key points highlighted',
    imageRules: 'Process diagrams, screenshots',
    calloutStyle: 'Tip/Warning/Note formatted boxes',
    tocStyle: 'Detailed module/lesson breakdown',
    footerStyle: 'Module name and page number',
  },
  {
    id: 'minimal-epub',
    name: 'Minimal EPUB Style',
    description: 'Clean, semantic HTML optimized for EPUB conversion.',
    pageSize: 'digital-pdf',
    margins: 'narrow',
    fontStyle: 'modern-sans',
    headingStyle: 'Semantic h1-h6 hierarchy',
    paragraphStyle: 'Simple paragraphs, reflowable',
    imageRules: 'Responsive images with alt text',
    calloutStyle: 'Semantic aside elements',
    tocStyle: 'Navigation document format',
    footerStyle: 'None (reflowable)',
  },
];

export const DEFAULT_REWRITE_SETTINGS: RewriteSettings = {
  bookType: 'nonfiction-guide',
  targetLength: 'keep-similar',
  chapterLength: 'medium',
  writingTone: 'professional',
  audience: 'general',
  paragraphStyle: 'balanced',
  bulletStyle: 'frequent',
  rewriteDepth: 'rewrite-professionally',
  contentAdditions: ['title-page', 'table-of-contents', 'introduction', 'conclusion'],
};

export const DEFAULT_FORMATTING_SETTINGS: FormattingSettings = {
  format: 'pdf-ebook',
  pageSize: '6x9',
  margins: 'standard',
  fontStyle: 'clean-professional',
  includeTitlePage: true,
  includeSubtitle: true,
  includeAuthor: true,
  includeCopyright: true,
  includeTableOfContents: true,
  includeChapterTitlePages: true,
  includePageNumbers: true,
  includeHeaders: false,
  includeFooters: true,
  imageCaptions: true,
  imageAltText: true,
  calloutBoxes: true,
  checklistBoxes: true,
  keyTakeawayBoxes: true,
  summaryBoxes: true,
};

export const DEFAULT_IMAGE_SETTINGS: ImageSettings = {
  mode: 'one-per-chapter',
  count: 'one-per-chapter',
  aspectRatio: '16:9',
  style: 'soft-editorial',
  quality: 'standard',
  captionsEnabled: true,
  altTextEnabled: true,
  consistentStyle: true,
};

export const DEFAULT_OUTLINE: EbookOutline = {
  chapters: [],
  includeTitlePage: true,
  includeCopyright: true,
  includeTableOfContents: true,
  includeIntroduction: true,
  includeConclusion: true,
  includeAboutAuthor: false,
  includeResources: false,
  includeGlossary: false,
  includeFAQs: false,
};

export function generateProjectId(): string {
  return `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateChapterId(): string {
  return `ch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateContentId(): string {
  return `cnt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateImageId(): string {
  return `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
