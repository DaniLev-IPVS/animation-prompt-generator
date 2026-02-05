import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { auth, signOut } from '@/lib/auth';
import {
  Sparkles,
  Settings,
  History,
  LogOut,
  User,
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      {/* Top Navigation */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/dashboard" className="flex items-center gap-2">
              {/* Mobile: show logomark */}
              <Image
                src="/images/IP Ventures Logomark Black.png"
                alt="IP Ventures"
                width={32}
                height={32}
                className="sm:hidden"
              />
              {/* Desktop: show full logo */}
              <Image
                src="/images/IP Ventures Long Logo Full Black.svg"
                alt="IP Ventures"
                width={150}
                height={40}
                className="hidden sm:block"
              />
            </Link>

            <nav className="flex items-center gap-1">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-purple-50 rounded-lg transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">Generator</span>
              </Link>
              <Link
                href="/dashboard/history"
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-purple-50 rounded-lg transition-colors"
              >
                <History className="w-4 h-4" />
                <span className="hidden sm:inline">History</span>
              </Link>
              <Link
                href="/dashboard/settings"
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-purple-50 rounded-lg transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Settings</span>
              </Link>

              <div className="h-6 w-px bg-gray-200 mx-2" />

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700 hidden sm:inline">
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
                    className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
