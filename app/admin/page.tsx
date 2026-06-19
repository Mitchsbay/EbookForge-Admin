'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Upload,
  FileText,
  Image as ImageIcon,
  Download,
  FolderOpen,
  Sparkles,
  BookOpen,
  Clock,
  ArrowRight,
  Play,
} from 'lucide-react';

interface StoredProject {
  id: string;
  title: string;
  updatedAt: string;
  status: string;
  chapterCount: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [recentProject, setRecentProject] = useState<StoredProject | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRecentProject = () => {
      try {
        const stored = localStorage.getItem('ebookforge_project');
        if (stored) {
          const project = JSON.parse(stored);
          setRecentProject({
            id: project.id,
            title: project.title || 'Untitled Project',
            updatedAt: project.updatedAt,
            status: project.status || 'draft',
            chapterCount: project.chapters?.length || 0,
          });
        }
      } catch (err) {
        console.error('Error loading recent project:', err);
      }
      setLoading(false);
    };

    loadRecentProject();
  }, []);

  const startNewProject = () => {
    router.push('/admin/upload');
  };

  const createSampleProject = () => {
    router.push('/admin/upload?sample=true');
  };

  const loadProject = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const project = JSON.parse(event.target?.result as string);
            localStorage.setItem('ebookforge_project', JSON.stringify(project));
            router.push('/admin/chapters');
          } catch (err) {
            alert('Invalid project file. Please check the file format.');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const continueProject = () => {
    router.push('/admin/chapters');
  };

  const quickActions = [
    { label: 'Upload DOCX', icon: Upload, action: startNewProject, color: 'bg-emerald-600' },
    { label: 'Create Outline', icon: FileText, action: () => router.push('/admin/outline?from-scratch=true'), color: 'bg-blue-600' },
    { label: 'Rewrite Ebook', icon: Sparkles, action: () => recentProject ? router.push('/admin/chapters') : startNewProject(), color: 'bg-purple-600' },
    { label: 'Generate Images', icon: ImageIcon, action: () => router.push('/admin/images'), color: 'bg-amber-600' },
    { label: 'Export Ready', icon: Download, action: () => router.push('/admin/export'), color: 'bg-rose-600' },
    { label: 'Try Sample Mode', icon: Play, action: createSampleProject, color: 'bg-slate-600' },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 p-4 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-100 mb-2">Dashboard</h1>
          <p className="text-zinc-400">Create, rewrite, and export professional ebooks</p>
        </header>

        {/* Recent Project Card */}
        {recentProject && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-zinc-500 text-sm mb-2">
                  <Clock className="w-4 h-4" />
                  <span>Continue Working</span>
                </div>
                <h2 className="text-xl font-semibold text-zinc-100 mb-1">{recentProject.title}</h2>
                <p className="text-zinc-500 text-sm">
                  {recentProject.chapterCount} chapters • Status: {recentProject.status}
                </p>
                <p className="text-zinc-600 text-xs mt-1">
                  Last saved: {new Date(recentProject.updatedAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={continueProject}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Main Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <button
            onClick={startNewProject}
            className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-8 text-left transition-all hover:bg-zinc-850 group"
          >
            <div className="flex items-center justify-center w-14 h-14 bg-emerald-600/20 rounded-xl mb-4 group-hover:bg-emerald-600/30 transition-colors">
              <Plus className="w-7 h-7 text-emerald-400" />
            </div>
            <h3 className="text-xl font-semibold text-zinc-100 mb-2">Start New Ebook</h3>
            <p className="text-zinc-500">Upload a Word document and start the rewrite process</p>
          </button>

          <button
            onClick={loadProject}
            className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-8 text-left transition-all hover:bg-zinc-850 group"
          >
            <div className="flex items-center justify-center w-14 h-14 bg-blue-600/20 rounded-xl mb-4 group-hover:bg-blue-600/30 transition-colors">
              <FolderOpen className="w-7 h-7 text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-zinc-100 mb-2">Load Project</h3>
            <p className="text-zinc-500">Import a previously saved project JSON file</p>
          </button>
        </div>

        {/* Quick Actions Grid */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-zinc-200 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  onClick={action.action}
                  className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-4 text-center transition-all hover:bg-zinc-850"
                >
                  <div className={`inline-flex items-center justify-center w-10 h-10 ${action.color}/20 rounded-lg mb-3`}>
                    <Icon className={`w-5 h-5 ${action.color.replace('bg-', 'text-').replace('-600', '-400')}`} />
                  </div>
                  <p className="text-sm font-medium text-zinc-300">{action.label}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center w-10 h-10 bg-amber-600/20 rounded-lg shrink-0">
              <BookOpen className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-zinc-100 font-medium mb-1">How It Works</h3>
              <ol className="text-zinc-500 text-sm space-y-1">
                <li>1. Upload your Word document (.docx)</li>
                <li>2. Review and edit the generated outline</li>
                <li>3. Adjust rewrite and formatting settings</li>
                <li>4. Rewrite chapter-by-chapter with AI</li>
                <li>5. Generate and place AI images</li>
                <li>6. Preview and export as DOCX, PDF, or EPUB-ready</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Warning about browser storage */}
        <div className="mt-6 bg-amber-950/30 border border-amber-900/50 rounded-xl p-4">
          <p className="text-amber-300 text-sm">
            <strong>Note:</strong> Projects are stored in your browser's local storage.
            Remember to export your project as JSON regularly to avoid losing work.
          </p>
        </div>
      </div>
    </div>
  );
}
