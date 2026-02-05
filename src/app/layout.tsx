import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Animation Prompt Generator',
  description: 'Generate AI prompts for animation production',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
