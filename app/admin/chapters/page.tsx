'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { countWordsInContentBlocks, countWordsInText, normaliseChapterWordCounts } from '@/lib/word-count';
import {
  FileText,
  Play,
  Pause,
  Loader2,
  CheckCircle,
  AlertCircle,
  Edit3,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  Sparkles,
  Download,
  Eye,
  Copy,
  FileText as WordsIcon,
  Clock,
  Save,
} from 'lucide-react';

interface ChapterContent {
  id: string;
  type: string;
  content: string;
  level?: number;
  items?: { id: string; text: string }[];
  style?: string;
}

interface Chapter {
  id: string;
  title: string;
  content: ChapterContent[];
  originalContent: string;
  wordCount: number;
  status: 'pending' | 'rewriting' | 'rewritten' | 'edited' | 'complete';
  images: any[];
  imageSuggestions: any[];
  notes: string;
  lastEdited: string;
}

interface Project {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  status?: string;
  updatedAt?: string;
  outline: {
    chapters: { id: string; title: string; summary: string; isLocked: boolean }[];
  };
  originalDocument: {
    rawText: string;
    detectedSections: { title: string; content: string; wordCount: number }[];
  };
  settings: any;
  chapters: Chapter[];
}

export default function ChaptersPage() {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [rewriting, setRewriting] = useState(false);
  const [rewritingAll, setRewritingAll] = useState(false);
  const [currentRewriteIndex, setCurrentRewriteIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingContent, setEditingContent] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const selectedChapter = chapters.find(c => c.id === selectedChapterId);

  useEffect(() => {
    loadProject();
  }, []);

  const loadProject = () => {
    const stored = localStorage.getItem('ebookforge_project');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Normalize stored word counts so old AI-estimated counts are corrected on load.
        const parsedWithCounts = {
          ...parsed,
          chapters: normaliseChapterWordCounts(parsed.chapters),
        };
        setProject(parsedWithCounts);

        // Initialize chapters if not exists
        if (parsedWithCounts.chapters && parsedWithCounts.chapters.length > 0) {
          setChapters(parsedWithCounts.chapters);
          setSelectedChapterId((current) => current || parsedWithCounts.chapters[0].id);
          localStorage.setItem('ebookforge_project', JSON.stringify(parsedWithCounts));
        } else if (parsed.outline?.chapters?.length > 0) {
          // Create chapters from outline
          const initialChapters: Chapter[] = parsed.outline.chapters.map((outlineCh: any, index: number) => {
            const detectedSection = parsed.originalDocument?.detectedSections?.[index];
            return {
              id: outlineCh.id || `ch_${Date.now()}_${index}`,
              title: outlineCh.title,
              content: [],
              originalContent: detectedSection?.content || '',
              wordCount: detectedSection?.wordCount || 0,
              status: 'pending',
              images: [],
              imageSuggestions: [],
              notes: outlineCh.summary || '',
              lastEdited: new Date().toISOString(),
            };
          });
          setChapters(initialChapters);
          setSelectedChapterId((current) => current || initialChapters[0]?.id || null);
          const projectWithInitialChapters = { ...parsedWithCounts, chapters: initialChapters };
          setProject(projectWithInitialChapters);
          localStorage.setItem('ebookforge_project', JSON.stringify(projectWithInitialChapters));
        }
      } catch (err) {
        console.error('Failed to load project:', err);
        setError('Failed to load project');
      }
    } else {
      router.push('/admin/upload');
    }
  };

  const persistProject = useCallback((nextChapters: Chapter[], status: string = 'rewriting') => {
    const chaptersWithCounts = normaliseChapterWordCounts(nextChapters);

    setChapters(chaptersWithCounts);
    setProject(prevProject => {
      const baseProject = prevProject || project;
      if (!baseProject) return prevProject;

      const updatedProject = {
        ...baseProject,
        chapters: chaptersWithCounts,
        updatedAt: new Date().toISOString(),
        status,
      };

      localStorage.setItem('ebookforge_project', JSON.stringify(updatedProject));
      return updatedProject;
    });

    setHasUnsavedChanges(false);
    return chaptersWithCounts;
  }, [project]);

  const saveProject = useCallback(async () => {
    if (!project) return;

    setSaving(true);
    persistProject(chapters, project.status || 'rewriting');
    setSaving(false);
  }, [project, chapters, persistProject]);

  const requestChapterRewrite = async (chapterToRewrite: Chapter): Promise<Chapter> => {
    if (!project) {
      throw new Error('No project loaded');
    }

    const response = await fetch('/api/rewrite-chapter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chapter: chapterToRewrite,
        settings: project.settings,
        outline: project.outline,
        bookTitle: project.title,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to rewrite chapter');
    }

    return {
      ...chapterToRewrite,
      content: data.chapter.content,
      wordCount: countWordsInContentBlocks(data.chapter.content),
      status: 'rewritten' as const,
      lastEdited: new Date().toISOString(),
    };
  };

  const rewriteChapter = async (chapterId: string) => {
    if (!project) return;

    const chapter = chapters.find(c => c.id === chapterId);
    if (!chapter) return;

    setError(null);
    setRewriting(true);

    let workingChapters = normaliseChapterWordCounts(
      chapters.map(c =>
        c.id === chapterId ? { ...c, status: 'rewriting' as const } : c
      )
    );
    persistProject(workingChapters, 'rewriting');

    try {
      const chapterToRewrite = workingChapters.find(c => c.id === chapterId) || chapter;
      const rewrittenChapter = await requestChapterRewrite(chapterToRewrite);

      workingChapters = normaliseChapterWordCounts(
        workingChapters.map(c =>
          c.id === chapterId ? rewrittenChapter : c
        )
      );

      persistProject(workingChapters, 'rewriting');
    } catch (err: any) {
      setError(err.message);

      workingChapters = normaliseChapterWordCounts(
        workingChapters.map(c =>
          c.id === chapterId ? { ...c, status: 'pending' as const } : c
        )
      );
      persistProject(workingChapters, 'rewriting');
    } finally {
      setRewriting(false);
    }
  };

  const rewriteAllChapters = async () => {
    if (!project) return;

    setRewritingAll(true);
    setError(null);

    // Keep a local working copy. Do not call rewriteChapter() from here, because
    // that can close over stale React state and overwrite earlier completed chapters.
    let workingChapters = normaliseChapterWordCounts(chapters);

    try {
      for (let i = 0; i < workingChapters.length; i++) {
        const chapter = workingChapters[i];
        if (chapter.status === 'complete' || chapter.status === 'rewritten') {
          continue;
        }

        setCurrentRewriteIndex(i);

        workingChapters = normaliseChapterWordCounts(
          workingChapters.map(c =>
            c.id === chapter.id ? { ...c, status: 'rewriting' as const } : c
          )
        );
        persistProject(workingChapters, 'rewriting');

        const chapterToRewrite = workingChapters.find(c => c.id === chapter.id) || chapter;
        const rewrittenChapter = await requestChapterRewrite(chapterToRewrite);

        workingChapters = normaliseChapterWordCounts(
          workingChapters.map(c =>
            c.id === chapter.id ? rewrittenChapter : c
          )
        );

        // Save after every chapter so completed chapters survive page refreshes,
        // failed later chapters, and React re-renders.
        persistProject(workingChapters, 'rewriting');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCurrentRewriteIndex(-1);
      setRewritingAll(false);
    }
  };

  const updateChapterContent = (chapterId: string, content: string) => {
    setChapters(prev =>
      prev.map(c =>
        c.id === chapterId
          ? {
              ...c,
              content: [{ id: `cnt_${Date.now()}`, type: 'paragraph', content }],
              wordCount: countWordsInText(content),
              status: 'edited',
              lastEdited: new Date().toISOString(),
            }
          : c
      )
    );
    setHasUnsavedChanges(true);
  };

  const renderContentPreview = (content: ChapterContent[]) => {
    if (!content || content.length === 0) {
      return <p className="text-zinc-500 italic">No content yet. Rewrite to generate.</p>;
    }

    return (
      <div className="prose prose-invert max-w-none">
        {content.map((block, index) => {
          switch (block.type) {
            case 'heading':
              const HeadingTag = `h${block.level || 1}` as any;
              return (
                <HeadingTag key={block.id || index} className="text-zinc-100 font-bold">
                  {block.content}
                </HeadingTag>
              );
            case 'paragraph':
              return (
                <p key={block.id || index} className="text-zinc-300 leading-relaxed mb-4">
                  {block.content}
                </p>
              );
            case 'bullet-list':
              return (
                <ul key={block.id || index} className="list-disc list-inside text-zinc-300 space-y-1 mb-4">
                  {(block.items || []).map((item, i) => (
                    <li key={item.id || i}>{item.text}</li>
                  ))}
                </ul>
              );
            case 'numbered-list':
              return (
                <ol key={block.id || index} className="list-decimal list-inside text-zinc-300 space-y-1 mb-4">
                  {(block.items || []).map((item, i) => (
                    <li key={item.id || i}>{item.text}</li>
                  ))}
                </ol>
              );
            case 'callout':
              return (
                <div
                  key={block.id || index}
                  className={`p-4 rounded-lg mb-4 ${
                    block.style === 'warning'
                      ? 'bg-amber-950/30 border border-amber-900/50'
                      : block.style === 'tip'
                      ? 'bg-emerald-950/30 border border-emerald-900/50'
                      : 'bg-blue-950/30 border border-blue-900/50'
                  }`}
                >
                  <p className="text-zinc-300">{block.content}</p>
                </div>
              );
            default:
              return null;
          }
        })}
      </div>
    );
  };

  const getPlainTextContent = (content: ChapterContent[]) => {
    if (!content || content.length === 0) return '';

    return content.map(block => {
      switch (block.type) {
        case 'heading':
          return `${'#'.repeat(block.level || 1)} ${block.content}\n\n`;
        case 'paragraph':
          return `${block.content}\n\n`;
        case 'bullet-list':
          return (block.items || []).map(item => `• ${item.text}`).join('\n') + '\n\n';
        case 'numbered-list':
          return (block.items || []).map((item, i) => `${i + 1}. ${item.text}`).join('\n') + '\n\n';
        case 'callout':
          return `> ${block.content}\n\n`;
        default:
          return '';
      }
    }).join('');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const downloadChapter = (chapter: Chapter, format: 'txt' | 'md') => {
    const content = getPlainTextContent(chapter.content);
    const filename = `${chapter.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${format}`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (hasUnsavedChanges) {
      const timer = setTimeout(() => {
        saveProject();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [hasUnsavedChanges, saveProject]);

  if (!project) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
      </div>
    );
  }

  const pendingCount = chapters.filter(c => c.status === 'pending').length;
  const rewrittenCount = chapters.filter(c => c.status === 'rewritten' || c.status === 'complete' || c.status === 'edited').length;

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="flex h-[calc(100vh-64px)]">
        {/* Chapter Sidebar */}
        <div className="w-72 bg-zinc-900 border-r border-zinc-800 flex flex-col">
          <div className="p-4 border-b border-zinc-800">
            <h2 className="text-lg font-semibold text-zinc-100">Chapters</h2>
            <div className="flex items-center gap-4 mt-2 text-sm">
              <span className="text-zinc-500">{rewrittenCount}/{chapters.length} done</span>
              {pendingCount > 0 && (
                <span className="text-amber-400">{pendingCount} pending</span>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {chapters.length === 0 ? (
              <p className="text-zinc-500 text-sm text-center p-4">
                No chapters. Generate an outline first.
              </p>
            ) : (
              <div className="space-y-1">
                {chapters.map((chapter, index) => (
                  <button
                    key={chapter.id}
                    onClick={() => setSelectedChapterId(chapter.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                      selectedChapterId === chapter.id
                        ? 'bg-emerald-600/20 text-emerald-400'
                        : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center justify-center w-6 h-6 rounded bg-zinc-800 text-xs">
                      {chapter.status === 'rewritten' || chapter.status === 'edited' || chapter.status === 'complete' ? (
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                      ) : chapter.status === 'rewriting' ? (
                        <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                      ) : (
                        <span className="text-zinc-500">{index + 1}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm">{chapter.title}</p>
                      <p className="text-xs text-zinc-600">{chapter.wordCount} words</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Rewrite All Button */}
          <div className="p-4 border-t border-zinc-800">
            <button
              onClick={rewriteAllChapters}
              disabled={rewritingAll || pendingCount === 0}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
            >
              {rewritingAll ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Rewriting {currentRewriteIndex + 1}/{chapters.length}</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Rewrite All Chapters</span>
                </>
              )}
            </button>
            {pendingCount === 0 && rewrittenCount > 0 && (
              <p className="text-center text-emerald-400 text-sm mt-2">All chapters ready!</p>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedChapter ? (
            <>
              {/* Chapter Header */}
              <div className="p-4 border-b border-zinc-800 bg-zinc-900/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-zinc-100">{selectedChapter.title}</h2>
                    <div className="flex items-center gap-4 mt-1 text-sm text-zinc-500">
                      <span className="flex items-center gap-1">
                        <WordsIcon className="w-4 h-4" />
                        {selectedChapter.wordCount} words
                      </span>
                      <span className={`flex items-center gap-1 ${
                        selectedChapter.status === 'rewritten' || selectedChapter.status === 'complete' || selectedChapter.status === 'edited'
                          ? 'text-emerald-400'
                          : selectedChapter.status === 'rewriting'
                          ? 'text-amber-400'
                          : 'text-zinc-500'
                      }`}>
                        {selectedChapter.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigator.clipboard.writeText(getPlainTextContent(selectedChapter.content))}
                      className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg"
                      title="Copy content"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => downloadChapter(selectedChapter, 'md')}
                      className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg"
                      title="Download chapter"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => rewriteChapter(selectedChapter.id)}
                      disabled={rewriting}
                      className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-700 text-white font-medium py-2 px-4 rounded-lg"
                    >
                      {rewriting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      <span>{rewriting ? 'Rewriting...' : 'Rewrite'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mx-4 mt-4 flex items-start gap-3 p-4 bg-red-950/50 border border-red-900/50 rounded-xl text-red-300">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Content Editor */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-4xl mx-auto">
                  {selectedChapter.content.length > 0 ? (
                    <div className="space-y-6">
                      {/* Preview */}
                      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                        <h3 className="text-zinc-400 text-sm font-medium mb-4">Preview</h3>
                        {renderContentPreview(selectedChapter.content)}
                      </div>

                      {/* Edit Area */}
                      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-zinc-400 text-sm font-medium">Edit Content</h3>
                          {hasUnsavedChanges && (
                            <span className="text-amber-400 text-sm">Unsaved changes</span>
                          )}
                        </div>
                        <textarea
                          value={editingContent || getPlainTextContent(selectedChapter.content)}
                          onChange={(e) => {
                            setEditingContent(e.target.value);
                            updateChapterContent(selectedChapter.id, e.target.value);
                          }}
                          className="w-full h-64 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-100 font-mono text-sm focus:outline-none focus:border-emerald-500"
                          placeholder="Edit chapter content..."
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FileText className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                      <h3 className="text-zinc-300 font-medium mb-2">No content yet</h3>
                      <p className="text-zinc-500 mb-6">Click "Rewrite" to generate this chapter's content</p>
                      <button
                        onClick={() => rewriteChapter(selectedChapter.id)}
                        disabled={rewriting}
                        className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-700 text-white font-medium py-2.5 px-5 rounded-lg"
                      >
                        {rewriting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                        <span>Rewrite Chapter</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <FileText className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                <h3 className="text-zinc-300 font-medium mb-2">Select a Chapter</h3>
                <p className="text-zinc-500">Choose a chapter from the sidebar to view and edit</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Notes */}
        {selectedChapter && (
          <div className="w-72 bg-zinc-900 border-l border-zinc-800 p-4 hidden xl:block">
            <h3 className="text-zinc-300 font-medium mb-4">Notes</h3>
            <textarea
              value={selectedChapter.notes}
              onChange={(e) => {
                setChapters(prev =>
                  prev.map(c =>
                    c.id === selectedChapter.id ? { ...c, notes: e.target.value } : c
                  )
                );
                setHasUnsavedChanges(true);
              }}
              className="w-full h-48 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-300 text-sm resize-none"
              placeholder="Add notes for this chapter..."
            />

            <div className="mt-6">
              <h3 className="text-zinc-300 font-medium mb-3">Stats</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Word Count</span>
                  <span className="text-zinc-300">{selectedChapter.wordCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Status</span>
                  <span className="text-zinc-300 capitalize">{selectedChapter.status}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Images</span>
                  <span className="text-zinc-300">{selectedChapter.images?.length || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Last Edited</span>
                  <span className="text-zinc-300 text-xs">
                    {new Date(selectedChapter.lastEdited).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="h-16 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between px-6">
        <button
          onClick={() => router.push('/admin/settings')}
          className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Settings</span>
        </button>

        {saving && (
          <span className="text-zinc-500 text-sm animate-pulse">Saving...</span>
        )}

        <button
          onClick={async () => {
            await saveProject();
            router.push('/admin/images');
          }}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 px-4 rounded-lg"
        >
          <span>Continue to Images</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
