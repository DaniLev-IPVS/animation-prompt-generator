import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { auth, signOut } from '@/lib/auth';
import { UserRole } from '@/types';
import {
  Sparkles,
  Settings,
  History,
  LogOut,
  User,
  Shield,
} from 'lucide-react';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/login');
  }

  // Check if user is admin or super admin
  const isAdmin = session.user.role === UserRole.ADMIN ||
                  session.user.role === UserRole.SUPER_ADMIN;

  return (
    <div className="min-h-screen bg-theme-primary">
      {/* Top Navigation */}
      <header className="bg-theme-secondary border-b border-theme-primary sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/dashboard" className="flex items-center gap-2">
              {/* Mobile: show logomark */}
              <Image
                src="/images/IP Ventures Logomark Black.png"
                alt="IP Ventures"
                width={32}
                height={32}
                className="sm:hidden logo-auto-invert"
              />
              {/* Desktop: show full logo */}
              <Image
                src="/images/IP Ventures Long Logo Full Black.svg"
                alt="IP Ventures"
                width={150}
                height={40}
                className="hidden sm:block logo-auto-invert"
              />
            </Link>

            <nav className="flex items-center gap-1">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-4 py-2 text-theme-secondary hover:bg-theme-tertiary rounded-lg transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">Generator</span>
              </Link>
              <Link
                href="/dashboard/history"
                className="flex items-center gap-2 px-4 py-2 text-theme-secondary hover:bg-theme-tertiary rounded-lg transition-colors"
              >
                <History className="w-4 h-4" />
                <span className="hidden sm:inline">History</span>
              </Link>
              <Link
                href="/dashboard/settings"
                className="flex items-center gap-2 px-4 py-2 text-theme-secondary hover:bg-theme-tertiary rounded-lg transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Settings</span>
              </Link>

              {/* Admin Tab - Only visible to admins */}
              {isAdmin && (
                <Link
                  href="/dashboard/admin"
                  className="flex items-center gap-2 px-4 py-2 text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors"
                >
                  <Shield className="w-4 h-4" />
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              )}

              <div className="h-6 w-px bg-theme-primary mx-2" />

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-theme-tertiary rounded-full">
                  <User className="w-4 h-4 text-theme-muted" />
                  <span className="text-sm text-theme-secondary hidden sm:inline">
                    {session.user.email}
                  </span>
                </div>
                <form
                  action={async () => {
                    'use server';
                    await signOut({ redirectTo: '/auth/login' });
                  }}
                >
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-3 py-2 text-theme-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Sign out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>{children}</main>
    </div>
  );
}
