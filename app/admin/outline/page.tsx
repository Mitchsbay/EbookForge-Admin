'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  List,
  Plus,
  Trash2,
  Edit3,
  GripVertical,
  ChevronRight,
  Loader2,
  AlertCircle,
  Lock,
  Unlock,
  Sparkles,
  RefreshCw,
  Save,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';

interface OutlineChapter {
  id: string;
  title: string;
  summary: string;
  sections: { id: string; title: string; summary: string }[];
  isLocked: boolean;
  order: number;
  isIntroduction?: boolean;
  isConclusion?: boolean;
}

interface OutlineData {
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

interface EbookProject {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  originalDocument: {
    rawText: string;
    detectedSections: { title: string; content: string }[];
  };
  outline: OutlineData;
  settings: any;
  chapters: any[];
}

function OutlineContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [project, setProject] = useState<EbookProject | null>(null);
  const [outline, setOutline] = useState<OutlineData | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const fromScratch = searchParams.get('from-scratch') === 'true';

  useEffect(() => {
    loadProject();
  }, []);

  const loadProject = () => {
    if (fromScratch) {
      const newProject: EbookProject = {
        id: `proj_\${Date.now()}`,
        title: 'New Ebook Project',
        subtitle: '',
        author: '',
        originalDocument: {
          rawText: '',
          detectedSections: [],
        },
        outline: {
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
        },
        settings: {
          bookType: 'nonfiction-guide',
          targetLength: 'keep-similar',
          chapterLength: 'medium',
          writingTone: 'professional',
          audience: 'general',
          paragraphStyle: 'balanced',
          bulletStyle: 'frequent',
          rewriteDepth: 'rewrite-professionally',
          contentAdditions: [],
        },
        chapters: [],
      };
      setProject(newProject);
      setOutline(newProject.outline);
      return;
    }

    const stored = localStorage.getItem('ebookforge_project');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setProject(parsed);
        setOutline(parsed.outline);
      } catch (err) {
        setError('Failed to load project');
      }
    } else {
      router.push('/admin/upload');
    }
  };

  const saveProject = () => {
    if (!project || !outline) return;

    setSaving(true);
    const updatedProject = {
      ...project,
      outline,
      updatedAt: new Date().toISOString(),
      status: 'outlining',
    };

    localStorage.setItem('ebookforge_project', JSON.stringify(updatedProject));
    setProject(updatedProject);
    setSaving(false);
  };

  const generateOutline = async () => {
    if (!project) return;

    setGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/generate-outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentTitle: project.title,
          rawText: project.originalDocument?.rawText || '',
          detectedSections: project.originalDocument?.detectedSections || [],
          settings: project.settings || {
            bookType: 'nonfiction-guide',
            audience: 'general',
            contentAdditions: [],
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate outline');
      }

      setOutline({
        ...outline!,
        chapters: data.outline,
      });
    } catch (err: any) {
      setError(err.message);
    }
    setGenerating(false);
  };

  const addChapter = () => {
    if (!outline) return;

    const newChapter: OutlineChapter = {
      id: 'ch_' + Date.now(),
      title: 'New Chapter',
      summary: '',
      sections: [],
      isLocked: false,
      order: outline.chapters.length + 1,
    };

    setOutline({
      ...outline,
      chapters: [...outline.chapters, newChapter],
    });
  };

  const deleteChapter = (chapterId: string) => {
    if (!outline) return;

    const chapter = outline.chapters.find(c => c.id === chapterId);
    if (chapter?.isLocked) return;

    setOutline({
      ...outline,
      chapters: outline.chapters
        .filter(c => c.id !== chapterId)
        .map((c, i) => ({ ...c, order: i + 1 })),
    });
  };

  const startEditing = (chapter: OutlineChapter) => {
    setEditingId(chapter.id);
    setEditTitle(chapter.title);
    setEditSummary(chapter.summary);
  };

  const saveEdit = () => {
    if (!outline || !editingId) return;

    setOutline({
      ...outline,
      chapters: outline.chapters.map(c =>
        c.id === editingId
          ? { ...c, title: editTitle, summary: editSummary }
          : c
      ),
    });
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditSummary('');
  };

  const toggleLock = (chapterId: string) => {
    if (!outline) return;

    setOutline({
      ...outline,
      chapters: outline.chapters.map(c =>
        c.id === chapterId ? { ...c, isLocked: !c.isLocked } : c
      ),
    });
  };

  const handleDragStart = (chapterId: string) => {
    setDraggedId(chapterId);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!outline || !draggedId || draggedId === targetId) return;

    const chapters = [...outline.chapters];
    const draggedIndex = chapters.findIndex(c => c.id === draggedId);
    const targetIndex = chapters.findIndex(c => c.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const [draggedChapter] = chapters.splice(draggedIndex, 1);
    chapters.splice(targetIndex, 0, draggedChapter);

    setOutline({
      ...outline,
      chapters: chapters.map((c, i) => ({ ...c, order: i + 1 })),
    });
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  const continueToSettings = () => {
    saveProject();
    router.push('/admin/settings');
  };

  if (!outline) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-4 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-zinc-100 mb-2">Ebook Outline</h1>
            <p className="text-zinc-400">Structure your ebook content</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={generateOutline}
              disabled={generating}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>{generating ? 'Generating...' : 'Generate with AI'}</span>
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-6 flex items-start gap-3 p-4 bg-red-950/50 border border-red-900/50 rounded-xl text-red-300">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
          <h3 className="text-zinc-200 font-medium mb-4">Include Front & Back Matter</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { key: 'includeTitlePage', label: 'Title Page' },
              { key: 'includeCopyright', label: 'Copyright' },
              { key: 'includeTableOfContents', label: 'Table of Contents' },
              { key: 'includeIntroduction', label: 'Introduction' },
              { key: 'includeConclusion', label: 'Conclusion' },
              { key: 'includeAboutAuthor', label: 'About Author' },
              { key: 'includeResources', label: 'Resources' },
              { key: 'includeFAQs', label: 'FAQs' },
            ].map(option => (
              <label key={option.key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(outline as any)[option.key]}
                  onChange={(e) => setOutline({ ...outline, [option.key]: e.target.checked })}
                  className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
                />
                <span className="text-zinc-300 text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-zinc-200 font-medium">Chapters ({outline.chapters.length})</h3>
            <button
              onClick={addChapter}
              className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              <span>Add Chapter</span>
            </button>
          </div>

          {outline.chapters.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <List className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="mb-2">No chapters yet</p>
              <button
                onClick={generateOutline}
                className="text-emerald-400 hover:text-emerald-300"
              >
                Generate outline with AI
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {outline.chapters.map((chapter, index) => (
                <div
                  key={chapter.id}
                  draggable={!chapter.isLocked}
                  onDragStart={() => handleDragStart(chapter.id)}
                  onDragOver={(e) => handleDragOver(e, chapter.id)}
                  onDragEnd={handleDragEnd}
                  className="group flex items-start gap-3 p-4 bg-zinc-800/50 rounded-lg hover:bg-zinc-800"
                >
                  <div className="flex items-center gap-2 shrink-0">
                    <GripVertical className="w-4 h-4 text-zinc-600 cursor-grab" />
                    <span className="text-zinc-500 text-sm font-mono w-8">{index + 1}.</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    {editingId === chapter.id ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-emerald-500"
                          placeholder="Chapter title"
                        />
                        <textarea
                          value={editSummary}
                          onChange={(e) => setEditSummary(e.target.value)}
                          className="w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-emerald-500 text-sm"
                          rows={2}
                          placeholder="Chapter summary"
                        />
                        <div className="flex gap-2">
                          <button onClick={saveEdit} className="px-3 py-1 bg-emerald-600 text-white rounded text-sm">Save</button>
                          <button onClick={cancelEdit} className="px-3 py-1 bg-zinc-700 text-zinc-300 rounded text-sm">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h4 className="text-zinc-200 font-medium">{chapter.title}</h4>
                        {chapter.summary && <p className="text-zinc-500 text-sm mt-1">{chapter.summary}</p>}
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => toggleLock(chapter.id)}
                      className={'p-2 rounded hover:bg-zinc-700 ' + (chapter.isLocked ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300')}
                      title={chapter.isLocked ? 'Unlock chapter' : 'Lock chapter'}
                    >
                      {chapter.isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => startEditing(chapter)}
                      className="p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 rounded"
                      title="Edit chapter"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => !chapter.isLocked && deleteChapter(chapter.id)}
                      className={'p-2 rounded ' + (chapter.isLocked ? 'text-zinc-700 cursor-not-allowed' : 'text-zinc-500 hover:text-red-400 hover:bg-zinc-700')}
                      title={chapter.isLocked ? 'Locked' : 'Delete chapter'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/admin/upload')}
            className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Upload</span>
          </button>

          <button
            onClick={continueToSettings}
            disabled={saving || outline.chapters.length === 0}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Continue to Settings</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OutlinePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
      </div>
    }>
      <OutlineContent />
    </Suspense>
  );
}
