'use client';

import { useState, useEffect, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  Shield,
  ShieldCheck,
  User,
  FolderOpen,
  Zap,
  Calendar,
  Clock,
  ExternalLink,
  Edit,
} from 'lucide-react';
import { UserRole } from '@/types';

interface UserProject {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
  shotCount: number;
  sceneCount: number;
  runtime: number;
}

interface UserDetails {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  createdAt: string;
  lastActiveAt: string | null;
  projectCount: number;
  generationCount: number;
  totalTokensUsed: number;
  projects: UserProject[];
}

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const [user, setUser] = useState<UserDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isSuperAdmin = session?.user?.role === UserRole.SUPER_ADMIN;

  useEffect(() => {
    if (!isSuperAdmin) {
      router.push('/dashboard/admin');
      return;
    }
    loadUser();
  }, [resolvedParams.id, isSuperAdmin]);

  const loadUser = async () => {
    try {
      const response = await fetch(`/api/admin/users/${resolvedParams.id}`);
      if (response.ok) {
        const data = await response.json();
        setUser(data);
      } else if (response.status === 404) {
        setError('User not found');
      } else {
        setError('Failed to load user');
      }
    } catch (err) {
      console.error('Failed to load user:', err);
      setError('Failed to load user');
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case UserRole.SUPER_ADMIN:
        return <ShieldCheck className="w-5 h-5 text-purple-400" />;
      case UserRole.ADMIN:
        return <Shield className="w-5 h-5 text-blue-400" />;
      default:
        return <User className="w-5 h-5 text-gray-400" />;
    }
  };

  const getRoleBadge = (role: UserRole) => {
    const styles = {
      [UserRole.SUPER_ADMIN]: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      [UserRole.ADMIN]: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      [UserRole.USER]: 'bg-gray-500/20 text-theme-muted border-gray-500/30',
    };
    const labels = {
      [UserRole.SUPER_ADMIN]: 'Super Admin',
      [UserRole.ADMIN]: 'Admin',
      [UserRole.USER]: 'User',
    };
    return (
      <span className={`px-3 py-1 text-sm rounded-full border ${styles[role]}`}>
        {labels[role]}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (error || !user) {
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
          {error || 'User not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Back Button */}
      <Link
        href="/dashboard/admin"
        className="flex items-center gap-2 text-theme-muted hover:text-theme-primary mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Admin
      </Link>

      {/* User Header */}
      <div className="bg-theme-secondary rounded-xl border border-theme-primary p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {getRoleIcon(user.role)}
            <div>
              <h1 className="text-2xl font-bold text-theme-primary">{user.email}</h1>
              {user.name && (
                <p className="text-theme-muted">{user.name}</p>
              )}
            </div>
          </div>
          {getRoleBadge(user.role)}
        </div>

        {/* User Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="text-lg font-semibold text-theme-primary">{user.projectCount}</div>
              <div className="text-xs text-theme-muted">Projects</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="text-lg font-semibold text-theme-primary">{user.generationCount}</div>
              <div className="text-xs text-theme-muted">Generations</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <div className="text-lg font-semibold text-theme-primary">
                {new Date(user.createdAt).toLocaleDateString()}
              </div>
              <div className="text-xs text-theme-muted">Signed Up</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <div className="text-lg font-semibold text-theme-primary">
                {user.lastActiveAt
                  ? new Date(user.lastActiveAt).toLocaleDateString()
                  : 'Never'}
              </div>
              <div className="text-xs text-theme-muted">Last Active</div>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-theme-primary">
          <div className="text-sm text-theme-muted">
            Total Tokens Used: <span className="text-theme-primary font-semibold">{user.totalTokensUsed.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* User Projects */}
      <div className="bg-theme-secondary rounded-xl border border-theme-primary overflow-hidden">
        <div className="p-4 border-b border-theme-primary">
          <h2 className="text-lg font-semibold text-theme-primary">Projects ({user.projects.length})</h2>
        </div>

        {user.projects.length === 0 ? (
          <div className="p-8 text-center text-theme-muted">
            No projects yet
          </div>
        ) : (
          <div className="divide-y divide-theme-primary">
            {user.projects.map((project) => (
              <div key={project.id} className="p-4 hover:bg-theme-tertiary">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-theme-primary">{project.name}</h3>
                      {project.isPublic && (
                        <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded">
                          Public
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-theme-muted">
                      <span>{project.sceneCount} scenes</span>
                      <span>{project.shotCount} shots</span>
                      <span>{project.runtime.toFixed(1)}s runtime</span>
                    </div>
                    <div className="text-xs text-theme-muted mt-1">
                      Updated {new Date(project.updatedAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard/admin/projects/${project.id}`}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </Link>
                    <Link
                      href={`/dashboard/projects/${project.id}`}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-theme-tertiary text-theme-secondary hover:bg-theme-tertiary rounded transition-colors"
                      target="_blank"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
