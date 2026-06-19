'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Settings,
  ChevronDown,
  ChevronUp,
  Check,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Save,
  RefreshCw,
} from 'lucide-react';

import {
  BOOK_TYPE_OPTIONS,
  TARGET_LENGTH_OPTIONS,
  CHAPTER_LENGTH_OPTIONS,
  WRITING_TONE_OPTIONS,
  AUDIENCE_OPTIONS,
  PARAGRAPH_STYLE_OPTIONS,
  BULLET_STYLE_OPTIONS,
  REWRITE_DEPTH_OPTIONS,
  CONTENT_ADDITION_OPTIONS,
  PAGE_SIZE_OPTIONS,
  MARGIN_OPTIONS,
  FONT_STYLE_OPTIONS,
  IMAGE_STYLE_OPTIONS,
  IMAGE_ASPECT_RATIO_OPTIONS,
  IMAGE_MODE_OPTIONS,
  BUILT_IN_TEMPLATES,
  DEFAULT_REWRITE_SETTINGS,
  DEFAULT_FORMATTING_SETTINGS,
  DEFAULT_IMAGE_SETTINGS,
} from '@/lib/constants';

export default function SettingsPage() {
  const router = useRouter();
  const [project, setProject] = useState<any>(null);
  const [rewriteSettings, setRewriteSettings] = useState(DEFAULT_REWRITE_SETTINGS);
  const [formattingSettings, setFormattingSettings] = useState(DEFAULT_FORMATTING_SETTINGS);
  const [imageSettings, setImageSettings] = useState(DEFAULT_IMAGE_SETTINGS as any);
  const [expandedSections, setExpandedSections] = useState({
    rewrite: true,
    formatting: false,
    images: false,
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const hasLoadedProjectRef = useRef(false);

  useEffect(() => {
    const stored = localStorage.getItem('ebookforge_project');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setProject(parsed);
        if (parsed.settings) {
          setRewriteSettings({ ...DEFAULT_REWRITE_SETTINGS, ...parsed.settings });
        }
        if (parsed.formatting) {
          setFormattingSettings({ ...DEFAULT_FORMATTING_SETTINGS, ...parsed.formatting });
        }
        if (parsed.imageSettings) {
          setImageSettings({ ...DEFAULT_IMAGE_SETTINGS, ...parsed.imageSettings });
        }
      } catch (err) {
        console.error('Failed to load project:', err);
      }
    }
    hasLoadedProjectRef.current = true;
    setLoading(false);
  }, []);


  useEffect(() => {
    if (loading || !project || !hasLoadedProjectRef.current) return;

    const autosaveTimer = window.setTimeout(() => {
      const updatedProject = {
        ...project,
        settings: rewriteSettings,
        formatting: formattingSettings,
        imageSettings: imageSettings,
        updatedAt: new Date().toISOString(),
        status: 'settings',
      };

      localStorage.setItem('ebookforge_project', JSON.stringify(updatedProject));
      setProject(updatedProject);
    }, 250);

    return () => window.clearTimeout(autosaveTimer);
  }, [rewriteSettings, formattingSettings, imageSettings, loading, project]);

  const toggleSection = (section: 'rewrite' | 'formatting' | 'images') => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleRewriteChange = (key: string, value: any) => {
    setRewriteSettings((prev: any) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleFormattingChange = (key: string, value: any) => {
    setFormattingSettings((prev: any) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleImageChange = (key: string, value: any) => {
    setImageSettings((prev: any) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleNumberRewriteChange = (key: string, rawValue: string) => {
    const trimmed = rawValue.trim();
    const value = trimmed === '' ? undefined : Number(trimmed);

    setRewriteSettings((prev: any) => ({
      ...prev,
      [key]: Number.isFinite(value) ? value : undefined,
    }));
  };

  const toggleContentAddition = (value: string, checked: boolean) => {
    setRewriteSettings((prev: any) => ({
      ...prev,
      contentAdditions: checked
        ? [...(prev.contentAdditions || []), value]
        : (prev.contentAdditions || []).filter((a: string) => a !== value),
    }));
  };

  const saveSettings = async () => {
    if (!project) return;

    setSaving(true);

    let latestProject = project;
    try {
      const stored = localStorage.getItem('ebookforge_project');
      if (stored) {
        latestProject = { ...project, ...JSON.parse(stored) };
      }
    } catch {
      latestProject = project;
    }

    const updatedProject = {
      ...latestProject,
      settings: rewriteSettings,
      formatting: formattingSettings,
      imageSettings: imageSettings,
      updatedAt: new Date().toISOString(),
      status: 'settings',
    };

    localStorage.setItem('ebookforge_project', JSON.stringify(updatedProject));
    setProject(updatedProject);

    setSaving(false);
  };

  const continueToChapters = async () => {
    await saveSettings();
    router.push('/admin/chapters');
  };

  const applyTemplate = (template: typeof BUILT_IN_TEMPLATES[0]) => {
    handleFormattingChange('pageSize', template.pageSize);
    handleFormattingChange('margins', template.margins);
    handleFormattingChange('fontStyle', template.fontStyle);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
      </div>
    );
  }

  const SelectField = ({ label, value, options, onChange }: any) => (
    <div>
      <label className="block text-sm text-zinc-400 mb-2">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-100 focus:outline-none focus:border-emerald-500 transition-colors appearance-none cursor-pointer"
      >
        {options.map((opt: any) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );

  const CheckboxGrid = ({ options, selected, onChange }: any) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {options.map((opt: any) => (
        <label key={opt.value} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-zinc-800/50 transition-colors">
          <input
            type="checkbox"
            checked={selected.includes(opt.value)}
            onChange={(e) => onChange(opt.value, e.target.checked)}
            className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
          />
          <span className="text-zinc-300 text-sm">{opt.label}</span>
        </label>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 p-4 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-100 mb-2">Settings</h1>
          <p className="text-zinc-400">Configure rewrite and formatting options</p>
        </header>

        {/* Templates Quick Select */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
          <h3 className="text-zinc-200 font-medium mb-4">Quick Templates</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {BUILT_IN_TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => applyTemplate(template)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  formattingSettings.pageSize === template.pageSize && formattingSettings.fontStyle === template.fontStyle
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/50'
                }`}
              >
                <p className="text-zinc-200 text-sm font-medium truncate">{template.name}</p>
                <p className="text-zinc-500 text-xs mt-1 truncate">{template.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Rewrite Settings Section */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl mb-4">
          <button
            onClick={() => toggleSection('rewrite')}
            className="w-full flex items-center justify-between p-6"
          >
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-emerald-400" />
              <span className="text-lg font-medium text-zinc-200">Rewrite Settings</span>
            </div>
            {expandedSections.rewrite ? (
              <ChevronUp className="w-5 h-5 text-zinc-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-zinc-500" />
            )}
          </button>

          {expandedSections.rewrite && (
            <div className="px-6 pb-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <SelectField
                  label="Book Type"
                  value={rewriteSettings.bookType}
                  options={BOOK_TYPE_OPTIONS}
                  onChange={(v: any) => handleRewriteChange('bookType', v)}
                />
                <SelectField
                  label="Target Length"
                  value={rewriteSettings.targetLength}
                  options={TARGET_LENGTH_OPTIONS}
                  onChange={(v: any) => handleRewriteChange('targetLength', v)}
                />
                <SelectField
                  label="Chapter Length"
                  value={rewriteSettings.chapterLength}
                  options={CHAPTER_LENGTH_OPTIONS}
                  onChange={(v: any) => handleRewriteChange('chapterLength', v)}
                />
                <SelectField
                  label="Writing Tone"
                  value={rewriteSettings.writingTone}
                  options={WRITING_TONE_OPTIONS}
                  onChange={(v: any) => handleRewriteChange('writingTone', v)}
                />
                <SelectField
                  label="Target Audience"
                  value={rewriteSettings.audience}
                  options={AUDIENCE_OPTIONS}
                  onChange={(v: any) => handleRewriteChange('audience', v)}
                />
                <SelectField
                  label="Paragraph Style"
                  value={rewriteSettings.paragraphStyle}
                  options={PARAGRAPH_STYLE_OPTIONS}
                  onChange={(v: any) => handleRewriteChange('paragraphStyle', v)}
                />
                <SelectField
                  label="Bullet/List Style"
                  value={rewriteSettings.bulletStyle}
                  options={BULLET_STYLE_OPTIONS}
                  onChange={(v: any) => handleRewriteChange('bulletStyle', v)}
                />
                <SelectField
                  label="Rewrite Depth"
                  value={rewriteSettings.rewriteDepth}
                  options={REWRITE_DEPTH_OPTIONS}
                  onChange={(v: any) => handleRewriteChange('rewriteDepth', v)}
                />
              </div>

              {(rewriteSettings.targetLength === 'custom' || rewriteSettings.chapterLength === 'custom') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
                  {rewriteSettings.targetLength === 'custom' && (
                    <div>
                      <label className="block text-sm text-zinc-400 mb-2">Custom Total Book Word Count</label>
                      <input
                        type="number"
                        min={500}
                        step={100}
                        value={rewriteSettings.customWordCount ?? ''}
                        onChange={(e) => handleNumberRewriteChange('customWordCount', e.target.value)}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-100"
                        placeholder="e.g., 30000"
                      />
                      <p className="mt-2 text-xs text-zinc-500">Used as the overall ebook target. The app divides this across chapters unless a chapter target is also set.</p>
                    </div>
                  )}

                  {rewriteSettings.chapterLength === 'custom' && (
                    <div>
                      <label className="block text-sm text-zinc-400 mb-2">Custom Words Per Chapter</label>
                      <input
                        type="number"
                        min={200}
                        step={50}
                        value={rewriteSettings.customWordsPerChapter ?? ''}
                        onChange={(e) => handleNumberRewriteChange('customWordsPerChapter', e.target.value)}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-100"
                        placeholder="e.g., 1200"
                      />
                      <p className="mt-2 text-xs text-zinc-500">This is the clearest control for chapter rewrite length.</p>
                    </div>
                  )}
                </div>
              )}

              {rewriteSettings.audience === 'custom' && (
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Custom Audience</label>
                  <input
                    type="text"
                    value={rewriteSettings.customAudience || ''}
                    onChange={(e) => handleRewriteChange('customAudience', e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-100"
                    placeholder="e.g., first-time dog owners in Australia"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm text-zinc-400 mb-3">Content Additions</label>
                <CheckboxGrid
                  options={CONTENT_ADDITION_OPTIONS}
                  selected={rewriteSettings.contentAdditions || []}
                  onChange={toggleContentAddition}
                />
              </div>
            </div>
          )}
        </div>

        {/* Formatting Settings Section */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl mb-4">
          <button
            onClick={() => toggleSection('formatting')}
            className="w-full flex items-center justify-between p-6"
          >
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-blue-400" />
              <span className="text-lg font-medium text-zinc-200">Formatting Settings</span>
            </div>
            {expandedSections.formatting ? (
              <ChevronUp className="w-5 h-5 text-zinc-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-zinc-500" />
            )}
          </button>

          {expandedSections.formatting && (
            <div className="px-6 pb-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <SelectField
                  label="Page Size"
                  value={formattingSettings.pageSize}
                  options={PAGE_SIZE_OPTIONS}
                  onChange={(v: any) => handleFormattingChange('pageSize', v)}
                />
                <SelectField
                  label="Margins"
                  value={formattingSettings.margins}
                  options={MARGIN_OPTIONS}
                  onChange={(v: any) => handleFormattingChange('margins', v)}
                />
                <SelectField
                  label="Font Style"
                  value={formattingSettings.fontStyle}
                  options={FONT_STYLE_OPTIONS}
                  onChange={(v: any) => handleFormattingChange('fontStyle', v)}
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-3">Include in Ebook</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { key: 'includeTitlePage', label: 'Title Page' },
                    { key: 'includeSubtitle', label: 'Subtitle' },
                    { key: 'includeAuthor', label: 'Author' },
                    { key: 'includeCopyright', label: 'Copyright' },
                    { key: 'includeTableOfContents', label: 'Table of Contents' },
                    { key: 'includeChapterTitlePages', label: 'Chapter Titles' },
                    { key: 'includePageNumbers', label: 'Page Numbers' },
                    { key: 'includeHeaders', label: 'Headers' },
                    { key: 'includeFooters', label: 'Footers' },
                    { key: 'imageCaptions', label: 'Image Captions' },
                    { key: 'imageAltText', label: 'Image Alt Text' },
                    { key: 'calloutBoxes', label: 'Callout Boxes' },
                    { key: 'checklistBoxes', label: 'Checklist Boxes' },
                    { key: 'keyTakeawayBoxes', label: 'Key Takeaways' },
                    { key: 'summaryBoxes', label: 'Summary Boxes' },
                  ].map((opt) => (
                    <label key={opt.key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(formattingSettings as any)[opt.key]}
                        onChange={(e) => handleFormattingChange(opt.key, e.target.checked)}
                        className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
                      />
                      <span className="text-zinc-300 text-sm">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Image Settings Section */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl mb-6">
          <button
            onClick={() => toggleSection('images')}
            className="w-full flex items-center justify-between p-6"
          >
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-amber-400" />
              <span className="text-lg font-medium text-zinc-200">Image Settings</span>
            </div>
            {expandedSections.images ? (
              <ChevronUp className="w-5 h-5 text-zinc-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-zinc-500" />
            )}
          </button>

          {expandedSections.images && (
            <div className="px-6 pb-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <SelectField
                  label="Image Mode"
                  value={imageSettings.mode}
                  options={IMAGE_MODE_OPTIONS}
                  onChange={(v: any) => handleImageChange('mode', v)}
                />
                <SelectField
                  label="Image Style"
                  value={imageSettings.style}
                  options={IMAGE_STYLE_OPTIONS}
                  onChange={(v: any) => handleImageChange('style', v)}
                />
                <SelectField
                  label="Aspect Ratio"
                  value={imageSettings.aspectRatio}
                  options={IMAGE_ASPECT_RATIO_OPTIONS}
                  onChange={(v: any) => handleImageChange('aspectRatio', v)}
                />
                <SelectField
                  label="Quality"
                  value={imageSettings.quality}
                  options={[
                    { value: 'standard', label: 'Standard' },
                    { value: 'hd', label: 'HD' },
                  ]}
                  onChange={(v: any) => handleImageChange('quality', v)}
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { key: 'captionsEnabled', label: 'Captions' },
                  { key: 'altTextEnabled', label: 'Alt Text' },
                  { key: 'consistentStyle', label: 'Consistent Style' },
                ].map((opt) => (
                  <label key={opt.key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={imageSettings[opt.key as keyof typeof imageSettings]}
                      onChange={(e) => handleImageChange(opt.key, e.target.checked)}
                      className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="text-zinc-300 text-sm">{opt.label}</span>
                  </label>
                ))}
              </div>

              {imageSettings.style === 'custom' && (
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Custom Style Prompt</label>
                  <textarea
                    value={imageSettings.customStylePrompt || ''}
                    onChange={(e) => handleImageChange('customStylePrompt', e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-100"
                    rows={2}
                    placeholder="Describe the image style you want..."
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/admin/outline')}
            className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Outline</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={saveSettings}
              disabled={saving}
              className="flex items-center gap-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 font-medium py-3 px-4 rounded-lg transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save</span>
            </button>
            <button
              onClick={continueToChapters}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              <span>Continue to Chapters</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
