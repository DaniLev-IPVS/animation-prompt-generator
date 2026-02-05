'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  Users,
  FolderOpen,
  Zap,
  UserPlus,
  Loader2,
  Search,
  Shield,
  ShieldCheck,
  User,
  Eye,
  ChevronLeft,
  ChevronRight,
  Ban,
  AlertTriangle,
  X,
} from 'lucide-react';
import { UserRole } from '@/types';

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  createdAt: string;
  lastActiveAt: string | null;
  projectCount: number;
  generationCount: number;
  totalTokensUsed: number;
}

interface AdminUserStats {
  totalUsers: number;
  totalProjects: number;
  totalGenerations: number;
  usersThisMonth: number;
}

interface ConfirmationModal {
  isOpen: boolean;
  userId: string;
  userEmail: string;
  currentRole: UserRole;
  newRole: UserRole;
}

export default function AdminPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<AdminUserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<ConfirmationModal>({
    isOpen: false,
    userId: '',
    userEmail: '',
    currentRole: UserRole.USER,
    newRole: UserRole.USER,
  });

  const isSuperAdmin = session?.user?.role === UserRole.SUPER_ADMIN;

  useEffect(() => {
    loadUsers();
  }, [page]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadUsers = async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
      });

      const response = await fetch(`/api/admin/users?${params}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
        setStats(data.stats);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Check if role change requires confirmation
  const requiresConfirmation = (currentRole: UserRole, newRole: UserRole): boolean => {
    // Confirm when promoting to or demoting from Super Admin
    if (newRole === UserRole.SUPER_ADMIN || currentRole === UserRole.SUPER_ADMIN) {
      return true;
    }
    // Confirm when revoking access
    if (newRole === UserRole.REVOKED) {
      return true;
    }
    return false;
  };

  const handleRoleChange = (userId: string, userEmail: string, currentRole: UserRole, newRole: UserRole) => {
    if (requiresConfirmation(currentRole, newRole)) {
      setConfirmModal({
        isOpen: true,
        userId,
        userEmail,
        currentRole,
        newRole,
      });
    } else {
      updateUserRole(userId, newRole);
    }
  };

  const confirmRoleChange = () => {
    updateUserRole(confirmModal.userId, confirmModal.newRole);
    setConfirmModal({ ...confirmModal, isOpen: false });
  };

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    if (!isSuperAdmin) return;

    setUpdatingUserId(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        setUsers(users.map(u =>
          u.id === userId ? { ...u, role: newRole } : u
        ));
      }
    } catch (error) {
      console.error('Failed to update role:', error);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case UserRole.SUPER_ADMIN:
        return <ShieldCheck className="w-4 h-4 text-purple-400" />;
      case UserRole.ADMIN:
        return <Shield className="w-4 h-4 text-blue-400" />;
      case UserRole.REVOKED:
        return <Ban className="w-4 h-4 text-red-400" />;
      default:
        return <User className="w-4 h-4 text-gray-400" />;
    }
  };

  const getRoleLabel = (role: UserRole): string => {
    const labels: Record<UserRole, string> = {
      [UserRole.SUPER_ADMIN]: 'Super Admin',
      [UserRole.ADMIN]: 'Admin',
      [UserRole.USER]: 'User',
      [UserRole.REVOKED]: 'Revoked',
    };
    return labels[role];
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-theme-primary mb-6">Admin Dashboard</h1>

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-theme-secondary border border-theme-primary rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <h2 className="text-lg font-semibold text-theme-primary">Confirm Role Change</h2>
            </div>

            <p className="text-theme-secondary mb-4">
              Are you sure you want to change <span className="font-semibold text-theme-primary">{confirmModal.userEmail}</span> from{' '}
              <span className="font-semibold text-theme-primary">{getRoleLabel(confirmModal.currentRole)}</span> to{' '}
              <span className={`font-semibold ${confirmModal.newRole === UserRole.REVOKED ? 'text-red-400' : confirmModal.newRole === UserRole.SUPER_ADMIN ? 'text-purple-400' : 'text-theme-primary'}`}>
                {getRoleLabel(confirmModal.newRole)}
              </span>?
            </p>

            {confirmModal.newRole === UserRole.SUPER_ADMIN && (
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 mb-4">
                <p className="text-sm text-purple-400">
                  <strong>Warning:</strong> This will give the user full administrative privileges, including the ability to modify other users and access all projects.
                </p>
              </div>
            )}

            {confirmModal.newRole === UserRole.REVOKED && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-400">
                  <strong>Warning:</strong> This will prevent the user from logging in. They will lose access to their account.
                </p>
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                className="px-4 py-2 text-sm text-theme-secondary hover:text-theme-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmRoleChange}
                className={`px-4 py-2 text-sm text-white rounded-lg transition-colors ${
                  confirmModal.newRole === UserRole.REVOKED
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                Confirm Change
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={<Users className="w-5 h-5" />}
            label="Total Users"
            value={stats.totalUsers}
            color="purple"
          />
          <StatCard
            icon={<FolderOpen className="w-5 h-5" />}
            label="Total Projects"
            value={stats.totalProjects}
            color="blue"
          />
          <StatCard
            icon={<Zap className="w-5 h-5" />}
            label="Total Generations"
            value={stats.totalGenerations}
            color="green"
          />
          <StatCard
            icon={<UserPlus className="w-5 h-5" />}
            label="New This Month"
            value={stats.usersThisMonth}
            color="orange"
          />
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-theme-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users by email or name..."
            className="w-full pl-10 pr-4 py-3 bg-theme-secondary border border-theme-primary rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-theme-primary placeholder-theme-muted"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-theme-secondary rounded-xl border border-theme-primary overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-theme-primary bg-theme-tertiary">
                <th className="text-left px-4 py-3 text-sm font-semibold text-theme-secondary">User</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-theme-secondary">Role</th>
                <th className="text-center px-4 py-3 text-sm font-semibold text-theme-secondary">Projects</th>
                <th className="text-center px-4 py-3 text-sm font-semibold text-theme-secondary">Generations</th>
                <th className="text-center px-4 py-3 text-sm font-semibold text-theme-secondary">Tokens</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-theme-secondary">Signed Up</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-theme-secondary">Last Active</th>
                <th className="text-center px-4 py-3 text-sm font-semibold text-theme-secondary"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className={`border-b border-theme-primary hover:bg-theme-tertiary ${user.role === UserRole.REVOKED ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getRoleIcon(user.role)}
                      <div>
                        <div className="font-medium text-theme-primary">{user.email}</div>
                        {user.name && (
                          <div className="text-sm text-theme-muted">{user.name}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {isSuperAdmin && user.id !== session?.user?.id ? (
                        <>
                          <select
                            value={user.role}
                            onChange={(e) => handleRoleChange(user.id, user.email, user.role, e.target.value as UserRole)}
                            disabled={updatingUserId === user.id}
                            className="px-2 py-1.5 text-xs bg-theme-tertiary border border-theme-primary rounded text-theme-secondary focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                          >
                            <option value={UserRole.REVOKED}>Revoked</option>
                            <option value={UserRole.USER}>User</option>
                            <option value={UserRole.ADMIN}>Admin</option>
                            <option value={UserRole.SUPER_ADMIN}>Super Admin</option>
                          </select>
                          {updatingUserId === user.id && (
                            <Loader2 className="w-3 h-3 animate-spin text-purple-400" />
                          )}
                        </>
                      ) : (
                        <RoleBadge role={user.role} isYou={user.id === session?.user?.id} />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-theme-secondary">{user.projectCount}</td>
                  <td className="px-4 py-3 text-center text-theme-secondary">{user.generationCount}</td>
                  <td className="px-4 py-3 text-center text-theme-secondary">
                    {user.totalTokensUsed.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-theme-muted">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-theme-muted">
                    {user.lastActiveAt
                      ? new Date(user.lastActiveAt).toLocaleDateString()
                      : 'Never'
                    }
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/admin/users/${user.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-theme-primary">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 px-3 py-1 text-sm text-theme-secondary hover:text-purple-400 disabled:opacity-50 disabled:hover:text-theme-secondary"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <span className="text-sm text-theme-muted">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 px-3 py-1 text-sm text-theme-secondary hover:text-purple-400 disabled:opacity-50 disabled:hover:text-theme-secondary"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function RoleBadge({ role, isYou }: { role: UserRole; isYou?: boolean }) {
  const styles: Record<UserRole, string> = {
    [UserRole.SUPER_ADMIN]: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    [UserRole.ADMIN]: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    [UserRole.USER]: 'bg-gray-500/20 text-theme-muted border-gray-500/30',
    [UserRole.REVOKED]: 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  const labels: Record<UserRole, string> = {
    [UserRole.SUPER_ADMIN]: 'Super Admin',
    [UserRole.ADMIN]: 'Admin',
    [UserRole.USER]: 'User',
    [UserRole.REVOKED]: 'Revoked',
  };
  return (
    <span className={`px-2 py-1 text-xs rounded-full border ${styles[role]}`}>
      {labels[role]}{isYou && ' (You)'}
    </span>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: 'purple' | 'blue' | 'green' | 'orange';
}) {
  const colorStyles = {
    purple: 'bg-purple-500/20 text-purple-400',
    blue: 'bg-blue-500/20 text-blue-400',
    green: 'bg-green-500/20 text-green-400',
    orange: 'bg-orange-500/20 text-orange-400',
  };

  return (
    <div className="bg-theme-secondary rounded-xl border border-theme-primary p-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${colorStyles[color]}`}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-theme-primary">{value.toLocaleString()}</div>
      <div className="text-sm text-theme-muted">{label}</div>
    </div>
  );
}
