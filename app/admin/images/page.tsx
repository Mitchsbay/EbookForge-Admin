'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Image as ImageIcon,
  Play,
  Loader2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Download,
  Trash2,
  Eye,
  Edit3,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Save,
  X,
  Check,
} from 'lucide-react';

interface ImageSuggestion {
  id: string;
  prompt: string;
  negativePrompt?: string;
  caption: string;
  altText: string;
  placement: string;
  reason: string;
  approved: boolean;
  generated: boolean;
}

interface EbookImage {
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
  style: string;
  aspectRatio: string;
  caption: string;
  altText: string;
  placement: string;
  chapterId?: string;
  isCover: boolean;
  generatedAt?: string;
}

interface Chapter {
  id: string;
  title: string;
  content: { id: string; type: string; content: string }[];
  imageSuggestions: ImageSuggestion[];
  images: EbookImage[];
}

interface Project {
  id: string;
  title: string;
  imageSettings: any;
  chapters: Chapter[];
  updatedAt?: string;
  status?: string;
}

export default function ImagesPage() {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [generatingPrompts, setGeneratingPrompts] = useState(false);
  const [generatingImages, setGeneratingImages] = useState(false);
  const [generatingImageId, setGeneratingImageId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [editPromptText, setEditPromptText] = useState('');
  const [viewingImage, setViewingImage] = useState<EbookImage | null>(null);

  const persistProject = (nextProject: Project) => {
    localStorage.setItem('ebookforge_project', JSON.stringify(nextProject));

    void fetch('/api/projects/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nextProject),
    }).catch((error) => {
      console.warn('Could not sync project to Supabase:', error);
    });
  };

  const withSaveMetadata = (nextProject: Project): Project => ({
    ...nextProject,
    updatedAt: new Date().toISOString(),
    status: 'images',
  });

  const getImageSrc = (image: EbookImage): string => {
    if (image.base64Data) {
      return image.base64Data.startsWith('data:')
        ? image.base64Data
        : `data:${image.mimeType || 'image/png'};base64,${image.base64Data}`;
    }

    // Prefer our own server-side proxy route for Supabase-stored images.
    // This avoids broken/expired signed URLs in the browser and keeps the
    // Supabase service role key safely on the server.
    if (image.storagePath) {
      return `/api/images/view?path=${encodeURIComponent(image.storagePath)}`;
    }

    return image.previewUrl || image.generatedUrl || image.storageUrl || '';
  };

  const refreshStoredImageUrls = async (currentProject: Project) => {
    const storedImages = currentProject.chapters
      .flatMap((chapter) => chapter.images || [])
      .filter((image) => image.storagePath);

    if (storedImages.length === 0) return;

    const signedUrlMap = new Map<string, string>();

    await Promise.all(storedImages.map(async (image) => {
      if (!image.storagePath) return;

      try {
        const response = await fetch('/api/images/signed-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storagePath: image.storagePath }),
        });

        const data = await response.json();
        if (response.ok && data.signedUrl) {
          signedUrlMap.set(image.id, data.signedUrl);
        }
      } catch (error) {
        console.warn('Could not refresh stored image preview URL:', error);
      }
    }));

    if (signedUrlMap.size === 0) return;

    const refreshedProject = {
      ...currentProject,
      chapters: currentProject.chapters.map((chapter) => ({
        ...chapter,
        images: (chapter.images || []).map((image) =>
          signedUrlMap.has(image.id)
            ? { ...image, previewUrl: signedUrlMap.get(image.id) }
            : image
        ),
      })),
    };

    setProject(refreshedProject);
    persistProject(refreshedProject);
  };

  useEffect(() => {
    void loadProject();
  }, []);

  const loadProject = async () => {
    const stored = localStorage.getItem('ebookforge_project');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);

        // Initialize images array if not exists
        if (parsed.chapters) {
          const chaptersWithImages = parsed.chapters.map((ch: Chapter) => ({
            ...ch,
            imageSuggestions: ch.imageSuggestions || [],
            images: ch.images || [],
          }));
          const normalisedProject = { ...parsed, chapters: chaptersWithImages };
          setProject(normalisedProject);
          void refreshStoredImageUrls(normalisedProject);
        } else {
          setProject(parsed);
        }
      } catch (err) {
        setError('Failed to load project');
      }
    } else {
      try {
        const response = await fetch('/api/projects/latest');
        const data = await response.json();

        if (response.ok && data.project) {
          const latestProject = data.project as Project;
          localStorage.setItem('ebookforge_project', JSON.stringify(latestProject));
          setProject(latestProject);
          void refreshStoredImageUrls(latestProject);
          return;
        }
      } catch (error) {
        console.warn('Could not load latest project from Supabase:', error);
      }

      router.push('/admin/upload');
    }
  };

  const saveProject = async () => {
    if (!project) return;

    setSaving(true);
    const updatedProject = {
      ...project,
      updatedAt: new Date().toISOString(),
      status: 'images',
    };

    persistProject(updatedProject);
    setProject(updatedProject);
    setSaving(false);
  };

  const selectedChapter = project?.chapters?.find((c: Chapter) => c.id === selectedChapterId);

  const generatePromptsForChapter = async (chapterId: string) => {
    if (!project) return;

    const chapter = project.chapters.find((c: Chapter) => c.id === chapterId);
    if (!chapter) return;

    setError(null);
    setGeneratingPrompts(true);

    try {
      const chapterContent = chapter.content
        .map((c: any) => c.content)
        .join('\n\n');

      const response = await fetch('/api/generate-image-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapterTitle: chapter.title,
          chapterContent,
          bookTitle: project.title,
          imageStyle: project.imageSettings?.style || 'soft-editorial',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate prompts');
      }

      // Update chapter with suggestions
      const updatedChapters = project.chapters.map((c: Chapter) =>
        c.id === chapterId
          ? {
              ...c,
              imageSuggestions: data.suggestions.map((s: ImageSuggestion) => ({
                ...s,
                approved: false,
                generated: false,
              })),
            }
          : c
      );

      const nextProject = withSaveMetadata({ ...project, chapters: updatedChapters });
      setProject(nextProject);
      persistProject(nextProject);
    } catch (err: any) {
      setError(err.message);
    }

    setGeneratingPrompts(false);
  };

  const generateAllPrompts = async () => {
    if (!project) return;

    setGeneratingPrompts(true);

    for (const chapter of project.chapters) {
      await generatePromptsForChapter(chapter.id);
    }

    setGeneratingPrompts(false);
  };

  const toggleApprovePrompt = (suggestionId: string) => {
    if (!project || !selectedChapterId) return;

    const updatedChapters = project.chapters.map((c: Chapter) => {
      if (c.id !== selectedChapterId) return c;

      return {
        ...c,
        imageSuggestions: c.imageSuggestions.map((s) =>
          s.id === suggestionId ? { ...s, approved: !s.approved } : s
        ),
      };
    });

    const nextProject = withSaveMetadata({ ...project, chapters: updatedChapters });
    setProject(nextProject);
    persistProject(nextProject);
  };

  const generateImage = async (suggestion: ImageSuggestion) => {
    if (!project || !selectedChapterId) return;

    setError(null);
    setGeneratingImageId(suggestion.id);

    try {
      const imageId = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: suggestion.prompt,
          style: project.imageSettings?.style || 'soft-editorial',
          projectId: project.id,
          chapterId: selectedChapterId,
          imageId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate image');
      }

      // Create image record
      const newImage: EbookImage = {
        id: data.image.id || imageId,
        prompt: suggestion.prompt,
        base64Data: data.image.base64Data,
        generatedUrl: data.image.generatedUrl,
        previewUrl: data.image.previewUrl,
        storageUrl: data.image.storageUrl,
        storagePath: data.image.storagePath,
        storageProvider: data.image.storageProvider || 'local',
        mimeType: data.image.mimeType || 'image/png',
        extension: data.image.extension || 'png',
        storageWarning: data.image.storageWarning,
        style: project.imageSettings?.style || 'soft-editorial',
        aspectRatio: project.imageSettings?.aspectRatio || '16:9',
        caption: suggestion.caption,
        altText: suggestion.altText,
        placement: suggestion.placement,
        chapterId: selectedChapterId,
        isCover: false,
        generatedAt: data.image.generatedAt || new Date().toISOString(),
      };

      // Update chapter
      const updatedChapters = project.chapters.map((c: Chapter) => {
        if (c.id !== selectedChapterId) return c;

        return {
          ...c,
          images: [...c.images, newImage],
          imageSuggestions: c.imageSuggestions.map((s) =>
            s.id === suggestion.id ? { ...s, generated: true } : s
          ),
        };
      });

      const nextProject = withSaveMetadata({ ...project, chapters: updatedChapters });
      setProject(nextProject);
      persistProject(nextProject);
    } catch (err: any) {
      setError(err.message);
    }

    setGeneratingImageId(null);
  };

  const generateAllApprovedImages = async () => {
    if (!selectedChapter) return;

    setGeneratingImages(true);

    for (const suggestion of selectedChapter.imageSuggestions.filter((s) => s.approved && !s.generated)) {
      await generateImage(suggestion);
    }

    setGeneratingImages(false);
  };

  const deleteImage = (imageId: string) => {
    if (!project || !selectedChapterId) return;

    const currentChapter = project.chapters.find((c) => c.id === selectedChapterId);
    const imageToDelete = currentChapter?.images?.find((img) => img.id === imageId);

    const updatedChapters = project.chapters.map((c: Chapter) => {
      if (c.id !== selectedChapterId) return c;

      return {
        ...c,
        images: c.images.filter((img) => img.id !== imageId),
      };
    });

    const nextProject = withSaveMetadata({ ...project, chapters: updatedChapters });
    setProject(nextProject);
    persistProject(nextProject);

    if (imageToDelete?.storagePath) {
      void fetch('/api/images/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storagePath: imageToDelete.storagePath }),
      }).catch((error) => {
        console.warn('Could not delete stored image from Supabase:', error);
      });
    }
  };

  const startEditPrompt = (suggestion: ImageSuggestion) => {
    setEditingPromptId(suggestion.id);
    setEditPromptText(suggestion.prompt);
  };

  const saveEditPrompt = () => {
    if (!project || !selectedChapterId || !editingPromptId) return;

    const updatedChapters = project.chapters.map((c: Chapter) => {
      if (c.id !== selectedChapterId) return c;

      return {
        ...c,
        imageSuggestions: c.imageSuggestions.map((s) =>
          s.id === editingPromptId ? { ...s, prompt: editPromptText } : s
        ),
      };
    });

    const nextProject = withSaveMetadata({ ...project, chapters: updatedChapters });
    setProject(nextProject);
    persistProject(nextProject);
    setEditingPromptId(null);
    setEditPromptText('');
  };

  const totalImages = project?.chapters?.reduce(
    (sum: number, c: Chapter) => sum + (c.images?.length || 0),
    0
  ) || 0;

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
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-zinc-100 mb-2">Image Generation</h1>
            <p className="text-zinc-400">Generate and manage ebook images</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={generateAllPrompts}
              disabled={generatingPrompts}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-700 text-white font-medium py-2.5 px-4 rounded-lg"
            >
              {generatingPrompts ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>Generate All Prompts</span>
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-6 flex items-start gap-3 p-4 bg-red-950/50 border border-red-900/50 rounded-xl text-red-300">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-zinc-500 text-sm mb-1">Total Images</p>
            <p className="text-2xl font-bold text-zinc-100">{totalImages}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-zinc-500 text-sm mb-1">Chapters</p>
            <p className="text-2xl font-bold text-zinc-100">{project.chapters?.length || 0}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-zinc-500 text-sm mb-1">Style</p>
            <p className="text-lg font-medium text-zinc-300 capitalize">
              {project.imageSettings?.style || 'soft-editorial'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chapter List */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-zinc-200 font-medium mb-4">Select Chapter</h3>
            <div className="space-y-2">
              {project.chapters?.map((chapter: Chapter) => (
                <button
                  key={chapter.id}
                  onClick={() => setSelectedChapterId(chapter.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                    selectedChapterId === chapter.id
                      ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30'
                      : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <ImageIcon className="w-5 h-5" />
                    <span className="truncate">{chapter.title}</span>
                  </div>
                  <span className={`text-sm ${chapter.images?.length > 0 ? 'text-emerald-400' : 'text-zinc-600'}`}>
                    {chapter.images?.length || 0}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Image Suggestions & Generated */}
          <div className="lg:col-span-2">
            {selectedChapter ? (
              <div className="space-y-6">
                {/* Image Suggestions */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-zinc-200 font-medium">Image Suggestions</h3>
                    <button
                      onClick={() => generatePromptsForChapter(selectedChapter.id)}
                      disabled={generatingPrompts}
                      className="text-sm text-emerald-400 hover:text-emerald-300"
                    >
                      {generatingPrompts ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Generate Prompts'
                      )}
                    </button>
                  </div>

                  {selectedChapter.imageSuggestions?.length > 0 ? (
                    <div className="space-y-4">
                      {selectedChapter.imageSuggestions.map((suggestion) => (
                        <div
                          key={suggestion.id}
                          className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700"
                        >
                          <div className="flex items-start gap-3">
                            <button
                              onClick={() => toggleApprovePrompt(suggestion.id)}
                              className={`shrink-0 w-6 h-6 rounded border flex items-center justify-center transition-colors ${
                                suggestion.approved
                                  ? 'bg-emerald-600 border-emerald-600 text-white'
                                  : 'border-zinc-600 hover:border-zinc-500'
                              }`}
                            >
                              {suggestion.approved && <Check className="w-4 h-4" />}
                            </button>

                            <div className="flex-1 min-w-0">
                              {editingPromptId === suggestion.id ? (
                                <div className="space-y-2">
                                  <textarea
                                    value={editPromptText}
                                    onChange={(e) => setEditPromptText(e.target.value)}
                                    className="w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-zinc-100 text-sm"
                                    rows={3}
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      onClick={saveEditPrompt}
                                      className="px-3 py-1 bg-emerald-600 text-white rounded text-sm"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={() => setEditingPromptId(null)}
                                      className="px-3 py-1 bg-zinc-700 text-zinc-300 rounded text-sm"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <p className="text-zinc-300 text-sm">{suggestion.prompt}</p>
                                  <p className="text-zinc-500 text-xs mt-1">{suggestion.reason}</p>
                                </>
                              )}

                              <div className="flex items-center gap-2 mt-2">
                                <button
                                  onClick={() => startEditPrompt(suggestion)}
                                  className="text-xs text-zinc-500 hover:text-zinc-300"
                                >
                                  Edit prompt
                                </button>
                                {suggestion.approved && (
                                  <button
                                    onClick={() => generateImage(suggestion)}
                                    disabled={generatingImageId === suggestion.id || suggestion.generated}
                                    className="text-xs text-emerald-400 hover:text-emerald-300"
                                  >
                                    {suggestion.generated
                                      ? 'Generated'
                                      : generatingImageId === suggestion.id
                                      ? 'Generating...'
                                      : 'Generate'}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      {selectedChapter.imageSuggestions.some((s) => s.approved && !s.generated) && (
                        <button
                          onClick={generateAllApprovedImages}
                          disabled={generatingImages}
                          className="w-full py-2 bg-emerald-600/20 text-emerald-400 rounded-lg hover:bg-emerald-600/30 transition-colors"
                        >
                          {generatingImages ? (
                            <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                          ) : (
                            'Generate All Approved Images'
                          )}
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className="text-zinc-500 text-center py-4">
                      No image suggestions yet. Click "Generate Prompts" to create them.
                    </p>
                  )}
                </div>

                {/* Generated Images */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                  <h3 className="text-zinc-200 font-medium mb-4">Generated Images</h3>

                  {selectedChapter.images?.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                      {selectedChapter.images.map((image) => (
                        <div
                          key={image.id}
                          className="relative group rounded-lg overflow-hidden border border-zinc-700"
                        >
                          {getImageSrc(image) ? (
                            <img
                              src={getImageSrc(image)}
                              alt={image.altText}
                              className="w-full aspect-square object-cover"
                            />
                          ) : (
                            <div className="w-full aspect-square bg-zinc-800 flex items-center justify-center">
                              <ImageIcon className="w-12 h-12 text-zinc-600" />
                            </div>
                          )}

                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button
                              onClick={() => setViewingImage(image)}
                              className="p-2 bg-white/20 rounded-lg hover:bg-white/30"
                            >
                              <Eye className="w-5 h-5 text-white" />
                            </button>
                            <button
                              onClick={() => deleteImage(image.id)}
                              className="p-2 bg-red-500/20 rounded-lg hover:bg-red-500/40"
                            >
                              <Trash2 className="w-5 h-5 text-white" />
                            </button>
                          </div>

                          <div className="p-3 bg-zinc-800">
                            <p className="text-zinc-300 text-sm truncate">{image.caption}</p>
                            <p className="text-zinc-500 text-xs mt-1">
                              {image.storagePath ? 'Saved to Supabase Storage' : 'Saved in browser storage'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-zinc-500 text-center py-4">
                      No images generated yet.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
                <ImageIcon className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                <p className="text-zinc-400">Select a chapter to manage images</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          <button
            onClick={() => router.push('/admin/chapters')}
            className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Chapters</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={saveProject}
              disabled={saving}
              className="flex items-center gap-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 font-medium py-2.5 px-4 rounded-lg"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save'}</span>
            </button>
            <button
              onClick={async () => {
                await saveProject();
                router.push('/admin/preview');
              }}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 px-4 rounded-lg"
            >
              <span>Continue to Preview</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Image Viewer Modal */}
      {viewingImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setViewingImage(null)}
        >
          <div className="relative max-w-4xl max-h-full" onClick={(e) => e.stopPropagation()}>
            {getImageSrc(viewingImage) && (
              <img
                src={getImageSrc(viewingImage)}
                alt={viewingImage.altText}
                className="max-w-full max-h-[80vh] object-contain rounded-lg"
              />
            )}
            <button
              onClick={() => setViewingImage(null)}
              className="absolute top-4 right-4 p-2 bg-black/50 rounded-lg hover:bg-black/70"
            >
              <X className="w-5 h-5 text-white" />
            </button>
            <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-4 rounded-b-lg">
              <p className="text-zinc-300">{viewingImage.caption}</p>
              <p className="text-zinc-500 text-sm mt-1">{viewingImage.altText}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
