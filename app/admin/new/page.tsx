'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  FileText,
  Sparkles,
  Play,
  ArrowRight,
  Loader2,
} from 'lucide-react';

export default function NewProjectPage() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [option, setOption] = useState<'upload' | 'outline' | 'sample' | null>(null);

  const createFromTopic = () => {
    setCreating(true);
    const project = {
      id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: 'New Ebook Project',
      subtitle: '',
      author: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'draft',
      originalDocument: null,
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
        contentAdditions: ['title-page', 'table-of-contents', 'introduction', 'conclusion'],
      },
      chapters: [],
      images: [],
      formatting: {
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
      },
      metadata: {
        exportHistory: [],
      },
    };

    localStorage.setItem('ebookforge_project', JSON.stringify(project));
    router.push('/admin/outline?from-scratch=true');
  };

  const startUpload = () => {
    setOption('upload');
    router.push('/admin/upload');
  };

  const startSample = () => {
    setOption('sample');
    router.push('/admin/upload?sample=true');
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-4 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-600 rounded-xl mb-6">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-zinc-100 mb-2">Start New Ebook Project</h1>
          <p className="text-zinc-400">Choose how you want to begin</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Upload Option */}
          <button
            onClick={startUpload}
            disabled={creating}
            className="bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 rounded-xl p-6 text-left transition-all hover:bg-zinc-850 group"
          >
            <div className="flex items-center justify-center w-14 h-14 bg-blue-600/20 rounded-xl mb-4 group-hover:bg-blue-600/30 transition-colors">
              <FileText className="w-7 h-7 text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-zinc-100 mb-2">Upload Document</h3>
            <p className="text-zinc-500 text-sm">
              Start with an existing Word document and transform it into a professional ebook.
            </p>
          </button>

          {/* Create Outline Option */}
          <button
            onClick={createFromTopic}
            disabled={creating}
            className="bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 rounded-xl p-6 text-left transition-all hover:bg-zinc-850 group"
          >
            <div className="flex items-center justify-center w-14 h-14 bg-purple-600/20 rounded-xl mb-4 group-hover:bg-purple-600/30 transition-colors">
              <Sparkles className="w-7 h-7 text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold text-zinc-100 mb-2">Create Outline</h3>
            <p className="text-zinc-500 text-sm">
              Start fresh with AI-generated outline from a topic or idea.
            </p>
          </button>

          {/* Sample Mode Option */}
          <button
            onClick={startSample}
            disabled={creating}
            className="bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 rounded-xl p-6 text-left transition-all hover:bg-zinc-850 group"
          >
            <div className="flex items-center justify-center w-14 h-14 bg-amber-600/20 rounded-xl mb-4 group-hover:bg-amber-600/30 transition-colors">
              <Play className="w-7 h-7 text-amber-400" />
            </div>
            <h3 className="text-xl font-semibold text-zinc-100 mb-2">Sample Mode</h3>
            <p className="text-zinc-500 text-sm">
              Try the app with a sample project. No upload required.
            </p>
          </button>
        </div>

        {creating && (
          <div className="flex items-center justify-center mt-8 text-zinc-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            <span>Creating project...</span>
          </div>
        )}
      </div>
    </div>
  );
}
