'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FolderOpen, Trash2, Share2, Loader2, Clock, Film, ExternalLink } from 'lucide-react';

interface ProjectSummary {
  id: string;
  name: string;
  isPublic: boolean;
  shareId: string | null;
  createdAt: string;
  updatedAt: string;
  shotCount: number;
  sceneCount: number;
  runtime: number;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteProject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    setDeletingId(id);
    try {
      const response = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setProjects(prev => prev.filter(p => p.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const toggleShare = async (project: ProjectSummary) => {
    setSharingId(project.id);
    try {
      if (project.isPublic) {
        await fetch(`/api/projects/${project.id}/share`, { method: 'DELETE' });
        setProjects(prev => prev.map(p => p.id === project.id ? { ...p, isPublic: false, shareId: null } : p));
      } else {
        const response = await fetch(`/api/projects/${project.id}/share`, { method: 'POST' });
        if (response.ok) {
          const data = await response.json();
          setProjects(prev => prev.map(p => p.id === project.id ? { ...p, isPublic: true, shareId: data.shareId } : p));
        }
      }
    } catch (error) {
      console.error('Failed to toggle share:', error);
    } finally {
      setSharingId(null);
    }
  };

  const copyShareLink = (shareId: string) => {
    const url = `${window.location.origin}/shared/${shareId}`;
    navigator.clipboard.writeText(url);
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Your Projects</h1>
        <Link
          href="/"
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          New Project
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-lg">
          <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No projects yet</h2>
          <p className="text-gray-500 mb-6">Create your first animation project to get started</p>
          <Link
            href="/"
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors inline-block"
          >
            Create Project
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map(project => (
            <div key={project.id} className="bg-white rounded-xl shadow-lg p-5 hover:shadow-xl transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <Link href={`/projects/${project.id}`} className="text-xl font-semibold text-gray-900 hover:text-purple-600 transition-colors">
                    {project.name}
                  </Link>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Film className="w-4 h-4" />
                      {project.sceneCount} scenes, {project.shotCount} shots
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {project.runtime.toFixed(1)}s
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Last updated: {new Date(project.updatedAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {project.isPublic && project.shareId && (
                    <button
                      onClick={() => copyShareLink(project.shareId!)}
                      className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 flex items-center gap-1"
                      title="Copy share link"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Copy Link
                    </button>
                  )}

                  <button
                    onClick={() => toggleShare(project)}
                    disabled={sharingId === project.id}
                    className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-1 transition-colors ${
                      project.isPublic
                        ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    title={project.isPublic ? 'Stop sharing' : 'Share project'}
                  >
                    {sharingId === project.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Share2 className="w-4 h-4" />
                    )}
                    {project.isPublic ? 'Shared' : 'Share'}
                  </button>

                  <button
                    onClick={() => deleteProject(project.id)}
                    disabled={deletingId === project.id}
                    className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete project"
                  >
                    {deletingId === project.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
