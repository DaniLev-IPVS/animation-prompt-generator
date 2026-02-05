'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { signOut } from 'next-auth/react';
import { Settings, History, LogOut, Menu, X } from 'lucide-react';

interface DashboardHeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
  };
}

export default function DashboardHeader({ user }: DashboardHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
  };

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            {/* Logomark for mobile, full logo for desktop */}
            <Image
              src="/images/IP Ventures Logomark Black.png"
              alt="IP Ventures"
              width={32}
              height={32}
              className="sm:hidden"
            />
            <Image
              src="/images/IP Ventures Long Logo Full Black.svg"
              alt="IP Ventures"
              width={150}
              height={32}
              className="hidden sm:block"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/history"
              className="flex items-center gap-2 text-gray-600 hover:text-purple-600 transition-colors"
            >
              <History className="w-4 h-4" />
              History
            </Link>
            <Link
              href="/settings"
              className="flex items-center gap-2 text-gray-600 hover:text-purple-600 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Settings
            </Link>
          </nav>

          {/* User Menu */}
          <div className="hidden md:flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {user.name || user.email}
            </span>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-600 hover:text-purple-600"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <nav className="flex flex-col gap-2">
              <Link
                href="/history"
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-purple-50 hover:text-purple-600 rounded-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                <History className="w-4 h-4" />
                History
              </Link>
              <Link
                href="/settings"
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-purple-50 hover:text-purple-600 rounded-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Settings className="w-4 h-4" />
                Settings
              </Link>
              <div className="border-t mt-2 pt-2">
                <span className="px-4 py-2 text-sm text-gray-500 block">
                  {user.name || user.email}
                </span>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg w-full"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
