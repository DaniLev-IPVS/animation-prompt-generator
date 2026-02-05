import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { auth } from '@/lib/auth';
import { Zap, Shield, Share2 } from 'lucide-react';

export default async function HomePage() {
  const session = await auth();

  // If logged in, redirect to dashboard
  if (session?.user) {
    redirect('/dashboard');
  }

  // If not logged in, show landing page
  return (
    <div className="min-h-screen bg-theme-primary">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/images/IP Ventures Logomark Black.png"
              alt="IP Ventures"
              width={40}
              height={40}
              className="sm:hidden logo-auto-invert"
            />
            <Image
              src="/images/IP Ventures Long Logo Full Black.svg"
              alt="IP Ventures"
              width={180}
              height={48}
              className="hidden sm:block logo-auto-invert"
            />
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/auth/login"
              className="px-4 py-2 text-theme-secondary hover:text-purple-500 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/auth/register"
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-4 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-5xl font-bold text-theme-primary mb-6">
            Transform Your Stories into
            <span className="text-purple-500"> Animation-Ready Prompts</span>
          </h1>
          <p className="text-xl text-theme-muted mb-8">
            Chat with AI to develop your story, then automatically generate
            detailed prompts for characters, backgrounds, frames, and animations.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/auth/register"
              className="px-8 py-4 bg-purple-600 text-white rounded-xl text-lg font-semibold hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              Start Creating
            </Link>
            <Link
              href="/auth/login"
              className="px-8 py-4 bg-theme-secondary text-purple-500 border-2 border-purple-600 rounded-xl text-lg font-semibold hover:bg-theme-tertiary transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-24">
          <div className="bg-theme-secondary p-8 rounded-2xl border border-theme-primary">
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-purple-500" />
            </div>
            <h3 className="text-xl font-bold text-theme-primary mb-2">
              8-Stage Pipeline
            </h3>
            <p className="text-theme-muted">
              From story concept to animation prompts. Generate shot lists,
              art styles, characters, backgrounds, items, frames, and
              animation directions.
            </p>
          </div>

          <div className="bg-theme-secondary p-8 rounded-2xl border border-theme-primary">
            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-green-500" />
            </div>
            <h3 className="text-xl font-bold text-theme-primary mb-2">
              Secure API Keys
            </h3>
            <p className="text-theme-muted">
              Your Anthropic API key is encrypted and stored securely. All AI
              calls happen server-side - your key is never exposed.
            </p>
          </div>

          <div className="bg-theme-secondary p-8 rounded-2xl border border-theme-primary">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4">
              <Share2 className="w-6 h-6 text-blue-500" />
            </div>
            <h3 className="text-xl font-bold text-theme-primary mb-2">
              Save & Share
            </h3>
            <p className="text-theme-muted">
              Auto-save your projects to the cloud. Share your animation
              prompts with collaborators using unique links.
            </p>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-24">
          <h2 className="text-3xl font-bold text-center text-theme-primary mb-12">
            How It Works
          </h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: 1, title: 'Develop Story', desc: 'Chat with AI to brainstorm and refine your story' },
              { step: 2, title: 'Generate Shots', desc: 'AI creates detailed shot list with timing and audio' },
              { step: 3, title: 'Create Assets', desc: 'Get prompts for characters, backgrounds, and props' },
              { step: 4, title: 'Export Prompts', desc: 'Copy prompts for frames and animations' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="text-center">
                <div className="w-12 h-12 bg-purple-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {step}
                </div>
                <h3 className="font-bold text-theme-primary mb-2">{title}</h3>
                <p className="text-sm text-theme-muted">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 mt-20 border-t border-theme-primary">
        <div className="text-center text-theme-muted text-sm">
          <p>Powered by Claude AI from Anthropic</p>
        </div>
      </footer>
    </div>
  );
}
