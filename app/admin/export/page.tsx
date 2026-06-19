'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { normaliseChapterWordCounts } from '@/lib/word-count';
import {
  Download,
  FileText,
  FileImage,
  Archive,
  Loader2,
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Save,
  Copy,
} from 'lucide-react';

interface Chapter {
  id: string;
  title: string;
  content: { id: string; type: string; content: string; level?: number; items?: { id: string; text: string }[] }[];
  wordCount: number;
  images: any[];
}

interface Project {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  chapters: Chapter[];
  formatting: any;
  settings: any;
}

interface ExportRecord {
  type: string;
  timestamp: string;
  status: 'success' | 'error';
  message?: string;
}

export default function ExportPage() {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const [exports, setExports] = useState<ExportRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProject();
  }, []);

  const loadProject = () => {
    const stored = localStorage.getItem('ebookforge_project');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const parsedWithCounts = {
          ...parsed,
          chapters: normaliseChapterWordCounts(parsed.chapters),
        };
        setProject(parsedWithCounts);
        localStorage.setItem('ebookforge_project', JSON.stringify(parsedWithCounts));
      } catch (err) {
        setError('Failed to load project');
      }
    } else {
      router.push('/admin/upload');
    }
  };

  const downloadBase64File = (base64: string, filename: string, mimeType: string = 'application/octet-stream') => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportDocx = async () => {
    if (!project) return;

    setExporting('docx');
    setError(null);

    try {
      const response = await fetch('/api/export/docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: project.title,
          subtitle: project.subtitle,
          author: project.author,
          chapters: project.chapters,
          formatting: project.formatting,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to export DOCX');
      }

      downloadBase64File(data.docxBase64, data.filename, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

      setExports(prev => [...prev, {
        type: 'Full DOCX',
        timestamp: new Date().toISOString(),
        status: 'success',
      }]);
    } catch (err: any) {
      setError(err.message);
      setExports(prev => [...prev, {
        type: 'Full DOCX',
        timestamp: new Date().toISOString(),
        status: 'error',
        message: err.message,
      }]);
    }

    setExporting(null);
  };

  const exportPdf = async () => {
    if (!project) return;

    setExporting('pdf');
    setError(null);

    try {
      const response = await fetch('/api/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: project.title,
          subtitle: project.subtitle,
          author: project.author,
          chapters: project.chapters,
          formatting: project.formatting,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to export PDF');
      }

      downloadBase64File(data.pdfBase64, data.filename || `${project.title}.pdf`, 'application/pdf');

      setExports(prev => [...prev, {
        type: 'Full PDF',
        timestamp: new Date().toISOString(),
        status: 'success',
      }]);
    } catch (err: any) {
      setError(err.message);
      setExports(prev => [...prev, {
        type: 'Full PDF',
        timestamp: new Date().toISOString(),
        status: 'error',
        message: err.message,
      }]);
    }

    setExporting(null);
  };

  const exportEpub = async () => {
    if (!project) return;

    setExporting('epub');
    setError(null);

    try {
      const response = await fetch('/api/export/epub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: project.title,
          subtitle: project.subtitle,
          author: project.author,
          chapters: project.chapters,
          formatting: project.formatting,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to export EPUB');
      }

      // Download as .epub with correct MIME type for KDP
      downloadBase64File(data.epubBase64, data.filename || `${project.title}.epub`, 'application/epub+zip');

      setExports(prev => [...prev, {
        type: 'EPUB',
        timestamp: new Date().toISOString(),
        status: 'success',
      }]);
    } catch (err: any) {
      setError(err.message);
      setExports(prev => [...prev, {
        type: 'EPUB',
        timestamp: new Date().toISOString(),
        status: 'error',
        message: err.message,
      }]);
    }

    setExporting(null);
  };

  const exportChapter = async (chapterId: string, format: 'docx' | 'md' | 'txt') => {
    if (!project) return;

    const chapter = project.chapters.find(c => c.id === chapterId);
    if (!chapter) return;

    setExporting(`chapter_${chapterId}_${format}`);
    setError(null);

    try {
      if (format === 'docx') {
        const response = await fetch('/api/export/docx', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: chapter.title,
            chapters: [chapter],
            formatting: { ...project.formatting, includeTitlePage: false, includeTableOfContents: false },
          }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        downloadBase64File(data.docxBase64, `${chapter.title}.docx`, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      } else {
        // Export as text/markdown
        const content = chapter.content.map(block => {
          switch (block.type) {
            case 'heading':
              return `${''.padStart(block.level || 1, '#')} ${block.content}\n\n`;
            case 'paragraph':
              return `${block.content}\n\n`;
            case 'bullet-list':
              return (block.items || []).map((item: any) => `• ${item.text}`).join('\n') + '\n\n';
            case 'numbered-list':
              return (block.items || []).map((item: any, i: number) => `${i + 1}. ${item.text}`).join('\n') + '\n\n';
            case 'callout':
              return `> ${block.content}\n\n`;
            default:
              return '';
          }
        }).join('');

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${chapter.title}.${format}`;
        a.click();
        URL.revokeObjectURL(url);
      }

      setExports(prev => [...prev, {
        type: `Chapter "${chapter.title}" (${format.toUpperCase()})`,
        timestamp: new Date().toISOString(),
        status: 'success',
      }]);
    } catch (err: any) {
      setError(err.message);
    }

    setExporting(null);
  };

  const exportProjectJson = () => {
    if (!project) return;

    const projectData = {
      ...project,
      exportedAt: new Date().toISOString(),
    };

    // Remove large image data
    const cleanedProject = {
      ...projectData,
      chapters: projectData.chapters.map(ch => ({
        ...ch,
        images: ch.images?.map((img: any) => ({
          ...img,
          base64Data: img.base64Data ? '[IMAGE_DATA_REMOVED]' : undefined,
        })),
      })),
    };

    const blob = new Blob([JSON.stringify(cleanedProject, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.title.replace(/[^a-z0-9]/gi, '_')}_project.json`;
    a.click();
    URL.revokeObjectURL(url);

    setExports(prev => [...prev, {
      type: 'Project JSON',
      timestamp: new Date().toISOString(),
      status: 'success',
    }]);
  };

  const exportImagesZip = async () => {
    if (!project) return;

    setExporting('images');
    setError(null);

    try {
      const response = await fetch('/api/export/images-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapters: project.chapters,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to export images');
      }

      downloadBase64File(data.zipBase64, data.filename || 'images.zip', 'application/zip');

      setExports(prev => [...prev, {
        type: 'Images ZIP',
        timestamp: new Date().toISOString(),
        status: 'success',
      }]);
    } catch (err: any) {
      setError(err.message);
    }

    setExporting(null);
  };

  if (!project) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-4 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-100 mb-2">Export</h1>
          <p className="text-zinc-400">Download your ebook in various formats</p>
        </header>

        {error && (
          <div className="mb-6 flex items-start gap-3 p-4 bg-red-950/50 border border-red-900/50 rounded-xl text-red-300">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Main Export Options */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-zinc-200 font-medium mb-6">Full Ebook Exports</h3>

            <div className="space-y-4">
              <button
                onClick={exportDocx}
                disabled={exporting !== null}
                className="w-full flex items-center justify-between p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-blue-400" />
                  <div className="text-left">
                    <p className="text-zinc-200 font-medium">Full DOCX</p>
                    <p className="text-zinc-500 text-sm">Microsoft Word format for editing</p>
                  </div>
                </div>
                {exporting === 'docx' ? (
                  <Loader2 className="w-5 h-5 text-zinc-400 animate-spin" />
                ) : (
                  <Download className="w-5 h-5 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
                )}
              </button>

              <button
                onClick={exportPdf}
                disabled={exporting !== null}
                className="w-full flex items-center justify-between p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <FileImage className="w-6 h-6 text-red-400" />
                  <div className="text-left">
                    <p className="text-zinc-200 font-medium">Full PDF</p>
                    <p className="text-zinc-500 text-sm">Ready for distribution</p>
                  </div>
                </div>
                {exporting === 'pdf' ? (
                  <Loader2 className="w-5 h-5 text-zinc-400 animate-spin" />
                ) : (
                  <Download className="w-5 h-5 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
                )}
              </button>

              <button
                onClick={exportEpub}
                disabled={exporting !== null}
                className="w-full flex items-center justify-between p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <Archive className="w-6 h-6 text-amber-400" />
                  <div className="text-left">
                    <p className="text-zinc-200 font-medium">EPUB</p>
                    <p className="text-zinc-500 text-sm">Ready for Amazon KDP upload</p>
                  </div>
                </div>
                {exporting === 'epub' ? (
                  <Loader2 className="w-5 h-5 text-zinc-400 animate-spin" />
                ) : (
                  <Download className="w-5 h-5 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
                )}
              </button>
            </div>
          </div>

          {/* Other Downloads */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-zinc-200 font-medium mb-6">Other Downloads</h3>

            <div className="space-y-4">
              <button
                onClick={exportProjectJson}
                disabled={exporting !== null}
                className="w-full flex items-center justify-between p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-emerald-400" />
                  <div className="text-left">
                    <p className="text-zinc-200 font-medium">Project JSON</p>
                    <p className="text-zinc-500 text-sm">Backup all project data</p>
                  </div>
                </div>
                <Download className="w-5 h-5 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
              </button>

              <button
                onClick={exportImagesZip}
                disabled={exporting !== null}
                className="w-full flex items-center justify-between p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <FileImage className="w-6 h-6 text-purple-400" />
                  <div className="text-left">
                    <p className="text-zinc-200 font-medium">All Images ZIP</p>
                    <p className="text-zinc-500 text-sm">Download all generated images</p>
                  </div>
                </div>
                {exporting === 'images' ? (
                  <Loader2 className="w-5 h-5 text-zinc-400 animate-spin" />
                ) : (
                  <Download className="w-5 h-5 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Chapter-by-Chapter Downloads */}
        <div className="mt-8 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-zinc-200 font-medium mb-6">Individual Chapter Downloads</h3>

          <div className="space-y-2">
            {project.chapters.map((chapter) => (
              <div
                key={chapter.id}
                className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-zinc-500" />
                  <div>
                    <p className="text-zinc-200">{chapter.title}</p>
                    <p className="text-zinc-500 text-sm">{chapter.wordCount} words</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => exportChapter(chapter.id, 'docx')}
                    disabled={exporting !== null}
                    className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-sm rounded-lg transition-colors"
                  >
                    {exporting === `chapter_${chapter.id}_docx` ? '...' : 'DOCX'}
                  </button>
                  <button
                    onClick={() => exportChapter(chapter.id, 'md')}
                    disabled={exporting !== null}
                    className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-sm rounded-lg transition-colors"
                  >
                    MD
                  </button>
                  <button
                    onClick={() => exportChapter(chapter.id, 'txt')}
                    disabled={exporting !== null}
                    className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-sm rounded-lg transition-colors"
                  >
                    TXT
                  </button>
                  <button
                    onClick={() => {
                      const content = chapter.content.map(block => block.content).join('\n\n');
                      navigator.clipboard.writeText(content);
                    }}
                    className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-sm rounded-lg transition-colors"
                    title="Copy as plain text"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Export History */}
        {exports.length > 0 && (
          <div className="mt-8 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-zinc-200 font-medium mb-4">Export History</h3>
            <div className="space-y-2">
              {exports.slice().reverse().map((exp, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    exp.status === 'success' ? 'bg-emerald-950/30' : 'bg-red-950/30'
                  }`}
                >
                  {exp.status === 'success' ? (
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-400" />
                  )}
                  <div className="flex-1">
                    <p className="text-zinc-300 text-sm">{exp.type}</p>
                    <p className="text-zinc-500 text-xs">
                      {new Date(exp.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          <button
            onClick={() => router.push('/admin/preview')}
            className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Preview</span>
          </button>

          <button
            onClick={() => {
              // Save project and show completion message
              const finalProject = {
                ...project,
                status: 'complete',
                completedAt: new Date().toISOString(),
              };
              localStorage.setItem('ebookforge_project', JSON.stringify(finalProject));
              router.push('/admin');
            }}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 px-4 rounded-lg"
          >
            <span>Return to Dashboard</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
