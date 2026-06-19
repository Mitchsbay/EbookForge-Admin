'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Eye,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  BookOpen,
  FileText,
  Image as ImageIcon,
  Loader2,
  Save,
} from 'lucide-react';

interface PublishingCheck {
  id: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  chapterId?: string;
  field?: string;
}

interface Chapter {
  id: string;
  title: string;
  content: { id: string; type: string; content: string; level?: number; items?: any[]; style?: string }[];
  wordCount: number;
  status: string;
  images: { id: string; caption: string; altText: string }[];
}

interface Project {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  chapters: Chapter[];
  formatting: any;
  images: any[];
}

export default function PreviewPage() {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [checks, setChecks] = useState<PublishingCheck[]>([]);
  const [checking, setChecking] = useState(true);
  const [previewMode, setPreviewMode] = useState<'chapter' | 'full'>('chapter');

  useEffect(() => {
    loadProject();
  }, []);

  useEffect(() => {
    if (project) {
      runPublishingChecks();
    }
  }, [project]);

  const loadProject = () => {
    const stored = localStorage.getItem('ebookforge_project');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setProject(parsed);

        // Select first chapter if available
        if (parsed.chapters?.length > 0) {
          setSelectedChapterId(parsed.chapters[0].id);
        }
      } catch (err) {
        console.error('Failed to load project:', err);
      }
    } else {
      router.push('/admin/upload');
    }
  };

  const runPublishingChecks = () => {
    const issues: PublishingCheck[] = [];

    if (!project) return;

    // Book-level checks
    if (!project.title || project.title.trim() === '') {
      issues.push({
        id: 'check_title',
        type: 'error',
        message: 'Book title is missing',
        field: 'title',
      });
    }

    if (project.formatting?.includeSubtitle && (!project.subtitle || project.subtitle.trim() === '')) {
      issues.push({
        id: 'check_subtitle',
        type: 'warning',
        message: 'Subtitle is enabled but missing',
        field: 'subtitle',
      });
    }

    if (project.formatting?.includeAuthor && (!project.author || project.author.trim() === '')) {
      issues.push({
        id: 'check_author',
        type: 'warning',
        message: 'Author name is missing',
        field: 'author',
      });
    }

    // Chapter-level checks
    if (!project.chapters || project.chapters.length === 0) {
      issues.push({
        id: 'check_chapters',
        type: 'error',
        message: 'No chapters in book',
      });
    } else {
      // Check for empty chapters
      project.chapters.forEach((chapter, index) => {
        if (!chapter.content || chapter.content.length === 0) {
          issues.push({
            id: `check_chapter_content_${chapter.id}`,
            type: 'error',
            message: `Chapter ${index + 1} ("${chapter.title}") has no content`,
            chapterId: chapter.id,
          });
        } else {
          // Check for very short content
          const wordCount = chapter.wordCount || 0;
          if (wordCount < 200) {
            issues.push({
              id: `check_chapter_short_${chapter.id}`,
              type: 'warning',
              message: `Chapter "${chapter.title}" is very short (${wordCount} words)`,
              chapterId: chapter.id,
            });
          }

          // Check for very long content
          if (wordCount > 8000) {
            issues.push({
              id: `check_chapter_long_${chapter.id}`,
              type: 'info',
              message: `Chapter "${chapter.title}" is very long (${wordCount} words). Consider splitting.`,
              chapterId: chapter.id,
            });
          }
        }

        // Check for duplicate chapter titles
        const duplicateTitles = project.chapters.filter(c => c.title === chapter.title);
        if (duplicateTitles.length > 1) {
          issues.push({
            id: `check_duplicate_title_${chapter.id}`,
            type: 'warning',
            message: `Duplicate chapter title: "${chapter.title}"`,
            chapterId: chapter.id,
          });
        }

        // Image checks
        if (chapter.images && chapter.images.length > 0) {
          chapter.images.forEach((image: any) => {
            if (!image.caption && project.formatting?.imageCaptions) {
              issues.push({
                id: `check_image_caption_${image.id}`,
                type: 'warning',
                message: `Image in "${chapter.title}" is missing a caption`,
                chapterId: chapter.id,
              });
            }
            if (!image.altText && project.formatting?.imageAltText) {
              issues.push({
                id: `check_image_alt_${image.id}`,
                type: 'warning',
                message: `Image in "${chapter.title}" is missing alt text`,
                chapterId: chapter.id,
              });
            }
          });
        }
      });

      // Check for missing introduction
      const hasIntroduction = project.chapters.some(
        (c: any) => c.isIntroduction || c.title.toLowerCase().includes('introduction')
      );
      if (!hasIntroduction && project.formatting?.includeIntroduction) {
        issues.push({
          id: 'check_introduction',
          type: 'warning',
          message: 'Introduction chapter is missing',
        });
      }

      // Check for missing conclusion
      const hasConclusion = project.chapters.some(
        (c: any) => c.isConclusion || c.title.toLowerCase().includes('conclusion')
      );
      if (!hasConclusion && project.formatting?.includeConclusion) {
        issues.push({
          id: 'check_conclusion',
          type: 'warning',
          message: 'Conclusion chapter is missing',
        });
      }
    }

    setChecks(issues);
    setChecking(false);
  };

  const selectedChapter = project?.chapters?.find((c: Chapter) => c.id === selectedChapterId);

  const errorCount = checks.filter(c => c.type === 'error').length;
  const warningCount = checks.filter(c => c.type === 'warning').length;

  const renderContent = (content: { id: string; type: string; content: string; level?: number; items?: any[]; style?: string }[]) => {
    if (!content || content.length === 0) {
      return <p className="text-zinc-500 italic">No content</p>;
    }

    return content.map((block: { id: string; type: string; content: string; level?: number; items?: any[]; style?: string }) => {
      switch (block.type) {
        case 'heading':
          const level = block.level || 1;
          const headingSizes: Record<number, string> = {
            1: 'text-2xl font-bold text-zinc-100 mb-4',
            2: 'text-xl font-semibold text-zinc-100 mb-3',
            3: 'text-lg font-semibold text-zinc-200 mb-2',
          };
          if (level === 1) {
            return <h1 key={block.id} className={headingSizes[1] || 'text-lg text-zinc-200'}>{block.content}</h1>;
          } else if (level === 2) {
            return <h2 key={block.id} className={headingSizes[2] || 'text-lg text-zinc-200'}>{block.content}</h2>;
          } else {
            return <h3 key={block.id} className={headingSizes[3] || 'text-lg text-zinc-200'}>{block.content}</h3>;
          }
        case 'paragraph':
          return (
            <p key={block.id} className="text-zinc-300 mb-4 leading-relaxed">
              {block.content}
            </p>
          );
        case 'bullet-list':
          return (
            <ul key={block.id} className="list-disc list-inside text-zinc-300 mb-4 space-y-1">
              {(block.items || []).map((item, i) => (
                <li key={item.id || i}>{item.text}</li>
              ))}
            </ul>
          );
        case 'numbered-list':
          return (
            <ol key={block.id} className="list-decimal list-inside text-zinc-300 mb-4 space-y-1">
              {(block.items || []).map((item, i) => (
                <li key={item.id || i}>{item.text}</li>
              ))}
            </ol>
          );
        case 'callout':
          const calloutStyles = {
            warning: 'bg-amber-950/30 border-amber-700',
            tip: 'bg-emerald-950/30 border-emerald-700',
            important: 'bg-blue-950/30 border-blue-700',
          };
          return (
            <div
              key={block.id}
              className={`p-4 rounded-lg border mb-4 ${
                calloutStyles[block.style as keyof typeof calloutStyles] || 'bg-zinc-800 border-zinc-700'
              }`}
            >
              <p className="text-zinc-300">{block.content}</p>
            </div>
          );
        case 'image':
          return (
            <div key={block.id} className="py-4">
              <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-8 text-center">
                <ImageIcon className="w-12 h-12 text-zinc-600 mx-auto mb-2" />
                <p className="text-zinc-500 text-sm">[Image: {block.content || 'Untitled'}]</p>
              </div>
            </div>
          );
        default:
          return null;
      }
    });
  };

  const renderFullPreview = () => {
    if (!project || !project.chapters) return null;

    return (
      <div className="max-w-2xl mx-auto">
        {/* Title Page */}
        <div className="text-center py-16 border-b border-zinc-800 mb-8">
          <h1 className="text-4xl font-bold text-zinc-100 mb-2">{project.title}</h1>
          {project.subtitle && (
            <p className="text-xl text-zinc-400 mb-4">{project.subtitle}</p>
          )}
          {project.author && (
            <p className="text-zinc-500">by {project.author}</p>
          )}
        </div>

        {/* Chapters */}
        {project.chapters.map((chapter, index) => (
          <div key={chapter.id} className="mb-12">
            <div className="flex items-center gap-4 mb-6 pb-4 border-b border-zinc-800">
              <span className="text-zinc-600 text-sm">{index + 1}</span>
              <h2 className="text-2xl font-bold text-zinc-100">{chapter.title}</h2>
            </div>
            {renderContent(chapter.content)}
          </div>
        ))}
      </div>
    );
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-4 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-zinc-100 mb-2">Preview</h1>
            <p className="text-zinc-400">Review your ebook before exporting</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setPreviewMode('chapter')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                previewMode === 'chapter'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Chapter Preview
            </button>
            <button
              onClick={() => setPreviewMode('full')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                previewMode === 'full'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Full Book Preview
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Publishing Checks */}
          <div className="lg:col-span-1">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <h3 className="text-zinc-200 font-medium mb-4">Publishing Readiness</h3>

              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <span className="text-zinc-300">{errorCount} errors</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span className="text-zinc-300">{warningCount} warnings</span>
                </div>
              </div>

              {checks.length === 0 ? (
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle className="w-5 h-5" />
                  <span>Ready to publish!</span>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {checks.map((check) => (
                    <div
                      key={check.id}
                      className={`p-3 rounded-lg ${
                        check.type === 'error'
                          ? 'bg-red-950/30 border border-red-900/50'
                          : check.type === 'warning'
                          ? 'bg-amber-950/30 border border-amber-900/50'
                          : 'bg-blue-950/30 border border-blue-900/50'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {check.type === 'error' ? (
                          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        ) : check.type === 'warning' ? (
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                        )}
                        <p className="text-zinc-300 text-sm">{check.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mt-4">
              <h3 className="text-zinc-200 font-medium mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Total Words</span>
                  <span className="text-zinc-300">
                    {project?.chapters?.reduce((sum, c) => sum + (c.wordCount || 0), 0).toLocaleString() || 0}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Chapters</span>
                  <span className="text-zinc-300">{project?.chapters?.length || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Images</span>
                  <span className="text-zinc-300">
                    {project?.chapters?.reduce((sum, c) => sum + (c.images?.length || 0), 0) || 0}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Est. Reading Time</span>
                  <span className="text-zinc-300">
                    {Math.ceil((project?.chapters?.reduce((sum, c) => sum + (c.wordCount || 0), 0) || 0) / 200)} min
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Preview Area */}
          <div className="lg:col-span-3">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 min-h-[600px]">
              {previewMode === 'full' ? (
                renderFullPreview()
              ) : (
                <>
                  {/* Chapter Tabs */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {project?.chapters?.map((chapter) => (
                      <button
                        key={chapter.id}
                        onClick={() => setSelectedChapterId(chapter.id)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          selectedChapterId === chapter.id
                            ? 'bg-emerald-600 text-white'
                            : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {chapter.title}
                      </button>
                    ))}
                  </div>

                  {/* Chapter Content */}
                  {selectedChapter ? (
                    <article className="max-w-2xl mx-auto">
                      <header className="mb-8">
                        <h2 className="text-2xl font-bold text-zinc-100">{selectedChapter.title}</h2>
                        <p className="text-zinc-500 text-sm mt-1">
                          {selectedChapter.wordCount} words • {selectedChapter.status}
                        </p>
                      </header>
                      {renderContent(selectedChapter.content)}
                    </article>
                  ) : (
                    <div className="flex items-center justify-center h-96">
                      <div className="text-center">
                        <BookOpen className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                        <p className="text-zinc-500">Select a chapter to preview</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          <button
            onClick={() => router.push('/admin/images')}
            className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Images</span>
          </button>

          <button
            onClick={() => {
              localStorage.setItem('ebookforge_project', JSON.stringify({
                ...project,
                updatedAt: new Date().toISOString(),
                status: 'preview',
              }));
              router.push('/admin/export');
            }}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 px-4 rounded-lg"
            disabled={errorCount > 0}
          >
            <span>{errorCount > 0 ? 'Fix Errors First' : 'Continue to Export'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
