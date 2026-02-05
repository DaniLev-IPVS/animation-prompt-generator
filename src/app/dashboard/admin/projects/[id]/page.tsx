'use client';

import { useState, useEffect, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  Save,
  User,
  Check,
} from 'lucide-react';
import { UserRole } from '@/types';

interface ProjectOwner {
  id: string;
  email: string;
  name: string | null;
}

interface AdminProject {
  id: string;
  userId: string;
  name: string;
  scriptInput: string | null;
  configInput: Record<string, unknown> | null;
  projectData: Record<string, unknown> | null;
  batchProgress: Record<string, unknown> | null;
  chatMessages: unknown[] | null;
  completedPrompts: Record<string, boolean> | null;
  isPublic: boolean;
  shareId: string | null;
  createdAt: string;
  updatedAt: string;
  user: ProjectOwner;
}

export default function AdminProjectEditPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const [project, setProject] = useState<AdminProject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Editable fields
  const [name, setName] = useState('');
  const [scriptInput, setScriptInput] = useState('');

  const isSuperAdmin = session?.user?.role === UserRole.SUPER_ADMIN;

  useEffect(() => {
    if (!isSuperAdmin) {
      router.push('/dashboard/admin');
      return;
    }
    loadProject();
  }, [resolvedParams.id, isSuperAdmin]);

  const loadProject = async () => {
    try {
      const response = await fetch(`/api/admin/projects/${resolvedParams.id}`);
      if (response.ok) {
        const data = await response.json();
        setProject(data);
        setName(data.name);
        setScriptInput(data.scriptInput || '');
      } else if (response.status === 404) {
        setError('Project not found');
      } else {
        setError('Failed to load project');
      }
    } catch (err) {
      console.error('Failed to load project:', err);
      setError('Failed to load project');
    } finally {
      setIsLoading(false);
    }
  };

  const saveProject = async () => {
    if (!project) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/projects/${resolvedParams.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          scriptInput,
        }),
      });

      if (response.ok) {
        setSaveMessage('Project saved successfully');
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        setSaveMessage('Failed to save project');
        setTimeout(() => setSaveMessage(''), 3000);
      }
    } catch (err) {
      console.error('Failed to save project:', err);
      setSaveMessage('Failed to save project');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Link
          href="/dashboard/admin"
          className="flex items-center gap-2 text-theme-muted hover:text-theme-primary mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Admin
        </Link>
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
          {error || 'Project not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Back Button */}
      <Link
        href={`/dashboard/admin/users/${project.userId}`}
        className="flex items-center gap-2 text-theme-muted hover:text-theme-primary mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to User
      </Link>

      {/* Project Header */}
      <div className="bg-theme-secondary rounded-xl border border-theme-primary p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-theme-primary">Edit Project</h1>
          <div className="flex items-center gap-2">
            {saveMessage && (
              <span className={`text-sm px-3 py-1 rounded ${saveMessage.includes('success') ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {saveMessage.includes('success') && <Check className="w-4 h-4 inline mr-1" />}
                {saveMessage}
              </span>
            )}
            <button
              onClick={saveProject}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Changes
            </button>
          </div>
        </div>

        {/* Owner Info */}
        <div className="flex items-center gap-2 text-sm text-theme-muted mb-4 pb-4 border-b border-theme-primary">
          <User className="w-4 h-4" />
          <span>Owner:</span>
          <Link
            href={`/dashboard/admin/users/${project.userId}`}
            className="text-purple-400 hover:text-purple-300"
          >
            {project.user.email}
          </Link>
          {project.user.name && <span>({project.user.name})</span>}
        </div>

        {/* Project Name */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-theme-secondary mb-2">
            Project Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 bg-theme-input border border-theme-primary rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-theme-primary"
          />
        </div>

        {/* Script Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-theme-secondary mb-2">
            Story Script
          </label>
          <textarea
            value={scriptInput}
            onChange={(e) => setScriptInput(e.target.value)}
            rows={10}
            className="w-full px-4 py-2 bg-theme-input border border-theme-primary rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-theme-primary font-mono text-sm resize-y"
          />
        </div>

        {/* Project Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-theme-primary">
          <div>
            <div className="text-xs text-theme-muted">Created</div>
            <div className="text-sm text-theme-primary">
              {new Date(project.createdAt).toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-xs text-theme-muted">Updated</div>
            <div className="text-sm text-theme-primary">
              {new Date(project.updatedAt).toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-xs text-theme-muted">Public</div>
            <div className="text-sm text-theme-primary">
              {project.isPublic ? 'Yes' : 'No'}
            </div>
          </div>
          <div>
            <div className="text-xs text-theme-muted">Share ID</div>
            <div className="text-sm text-theme-primary">
              {project.shareId || 'None'}
            </div>
          </div>
        </div>
      </div>

      {/* Raw Data View */}
      <div className="bg-theme-secondary rounded-xl border border-theme-primary p-6">
        <h2 className="text-lg font-semibold text-theme-primary mb-4">Project Data (Read-only)</h2>
        <div className="bg-theme-tertiary rounded-lg p-4 overflow-auto max-h-96">
          <pre className="text-xs text-theme-muted font-mono whitespace-pre-wrap">
            {JSON.stringify(project.projectData, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
