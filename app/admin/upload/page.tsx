'use client';

import { useState, useCallback, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Upload,
  FileText,
  AlertCircle,
  CheckCircle,
  Loader2,
  X,
  BookOpen,
  Type as WordsIcon,
  FileStack,
  Clock,
  ChevronRight,
  Play,
} from 'lucide-react';

interface ExtractedDocument {
  filename: string;
  rawText: string;
  detectedSections: { title: string; content: string; level: number; wordCount: number }[];
  detectedTitle: string;
  detectedAuthor: string;
  detectedSubtitle: string;
  warnings: string[];
  stats: {
    totalWords: number;
    totalCharacters: number;
    totalParagraphs: number;
    estimatedReadingTime: number;
    headingCount: number;
    listCount: number;
  };
}

function UploadContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [document, setDocument] = useState<ExtractedDocument | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedSubtitle, setEditedSubtitle] = useState('');
  const [editedAuthor, setEditedAuthor] = useState('');

  const isSampleMode = searchParams.get('sample') === 'true';

  useEffect(() => {
    if (isSampleMode) {
      loadSampleDocument();
    }
  }, [isSampleMode]);

  const loadSampleDocument = async () => {
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('sample', 'true');

      const res = await fetch('/api/extract-docx', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to load sample document');
        setUploading(false);
        return;
      }

      setDocument(data.document);
      setEditedTitle(data.document.detectedTitle);
      setEditedSubtitle(data.document.detectedSubtitle);
      setEditedAuthor(data.document.detectedAuthor);
      setUploaded(true);
    } catch (err) {
      setError('An error occurred while loading the sample');
    }
    setUploading(false);
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleFile = async (file: File) => {
    setError(null);
    setUploading(true);

    if (!file.name.endsWith('.docx')) {
      setError('Please upload a .docx file');
      setUploading(false);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be under 10MB');
      setUploading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/extract-docx', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to extract document');
        setUploading(false);
        return;
      }

      setDocument(data.document);
      setEditedTitle(data.document.detectedTitle);
      setEditedSubtitle(data.document.detectedSubtitle);
      setEditedAuthor(data.document.detectedAuthor);
      setUploaded(true);
    } catch (err) {
      setError('An error occurred while processing the file');
    }
    setUploading(false);
  };

  const continueToOutline = () => {
    if (!document) return;

    const project = {
      id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: editedTitle || document.detectedTitle || 'Untitled Ebook',
      subtitle: editedSubtitle || document.detectedSubtitle,
      author: editedAuthor || document.detectedAuthor,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'uploaded',
      originalDocument: document,
      outline: {
        chapters: document.detectedSections.map((section, index) => ({
          id: `ch_${Date.now()}_${index}`,
          title: section.title,
          summary: '',
          sections: [],
          isLocked: false,
          order: index + 1,
        })),
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
        sampleMode: isSampleMode,
      },
    };

    localStorage.setItem('ebookforge_project', JSON.stringify(project));
    router.push('/admin/outline');
  };

  const resetUpload = () => {
    setUploaded(false);
    setDocument(null);
    setError(null);
    setEditedTitle('');
    setEditedSubtitle('');
    setEditedAuthor('');
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-4 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-100 mb-2">Upload Document</h1>
          <p className="text-zinc-400">Upload your Word document to begin the ebook creation process</p>
        </header>

        {!uploaded && !uploading && (
          <div className="mb-6">
            <button
              onClick={loadSampleDocument}
              className="flex items-center gap-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl px-5 py-3 text-slate-300 transition-colors"
            >
              <Play className="w-5 h-5" />
              <span>Try Sample Mode (No Upload Required)</span>
            </button>
          </div>
        )}

        {!uploaded && (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-xl p-12 transition-colors ${
              dragActive
                ? 'border-emerald-500 bg-emerald-500/5'
                : 'border-zinc-700 hover:border-zinc-600 bg-zinc-900/50'
            }`}
          >
            <input
              type="file"
              accept=".docx"
              onChange={handleFileInput}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={uploading}
            />

            <div className="flex flex-col items-center text-center">
              {uploading ? (
                <>
                  <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                    <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                  </div>
                  <p className="text-zinc-300 font-medium mb-2">Processing document...</p>
                  <p className="text-zinc-500 text-sm">Extracting and analyzing text</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                    <Upload className="w-8 h-8 text-zinc-400" />
                  </div>
                  <p className="text-zinc-300 font-medium mb-2">
                    Drag and drop your DOCX file here
                  </p>
                  <p className="text-zinc-500 text-sm mb-4">
                    or click to browse
                  </p>
                  <p className="text-zinc-600 text-xs">
                    Maximum file size: 10MB
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-6 flex items-start gap-3 p-4 bg-red-950/50 border border-red-900/50 rounded-xl text-red-300">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">{error}</p>
            </div>
          </div>
        )}

        {uploaded && document && (
          <div className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-600/20 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-100">{document.filename}</h2>
                    <p className="text-zinc-500 text-sm">Document uploaded successfully</p>
                  </div>
                </div>
                <button
                  onClick={resetUpload}
                  className="text-zinc-500 hover:text-zinc-300 p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                <div className="bg-zinc-800/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-zinc-500 text-sm mb-1">
                    <WordsIcon className="w-4 h-4" />
                    <span>Words</span>
                  </div>
                  <p className="text-zinc-200 font-medium">{document.stats.totalWords.toLocaleString()}</p>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-zinc-500 text-sm mb-1">
                    <FileText className="w-4 h-4" />
                    <span>Sections</span>
                  </div>
                  <p className="text-zinc-200 font-medium">{document.detectedSections.length}</p>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-zinc-500 text-sm mb-1">
                    <FileStack className="w-4 h-4" />
                    <span>Paragraphs</span>
                  </div>
                  <p className="text-zinc-200 font-medium">{document.stats.totalParagraphs}</p>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-zinc-500 text-sm mb-1">
                    <Clock className="w-4 h-4" />
                    <span>Read Time</span>
                  </div>
                  <p className="text-zinc-200 font-medium">{document.stats.estimatedReadingTime} min</p>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h3 className="text-zinc-200 font-medium mb-4">Document Details (Edit as needed)</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Title</label>
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-100 focus:outline-none focus:border-emerald-500 transition-colors"
                    placeholder="Enter book title"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Subtitle</label>
                  <input
                    type="text"
                    value={editedSubtitle}
                    onChange={(e) => setEditedSubtitle(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-100 focus:outline-none focus:border-emerald-500 transition-colors"
                    placeholder="Enter subtitle (optional)"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Author</label>
                  <input
                    type="text"
                    value={editedAuthor}
                    onChange={(e) => setEditedAuthor(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-100 focus:outline-none focus:border-emerald-500 transition-colors"
                    placeholder="Enter author name"
                  />
                </div>
              </div>
            </div>

            {document.warnings.length > 0 && (
              <div className="bg-amber-950/30 border border-amber-900/50 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-amber-300 font-medium mb-2">Suggestions:</p>
                    <ul className="text-amber-300/80 text-sm space-y-1">
                      {document.warnings.map((warning, i) => (
                        <li key={i}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h3 className="text-zinc-200 font-medium mb-4">Detected Sections ({document.detectedSections.length})</h3>

              <div className="space-y-3">
                {document.detectedSections.slice(0, 8).map((section, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-zinc-200 truncate">{section.title}</p>
                      <p className="text-zinc-500 text-sm">{section.wordCount} words</p>
                    </div>
                    <BookOpen className="w-5 h-5 text-zinc-600 shrink-0" />
                  </div>
                ))}
                {document.detectedSections.length > 8 && (
                  <p className="text-zinc-500 text-sm text-center pt-2">
                    + {document.detectedSections.length - 8} more sections
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={continueToOutline}
                className="flex items-center gap-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 px-6 rounded-xl transition-colors"
              >
                <span>Continue to Outline</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function UploadPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
      </div>
    }>
      <UploadContent />
    </Suspense>
  );
}
