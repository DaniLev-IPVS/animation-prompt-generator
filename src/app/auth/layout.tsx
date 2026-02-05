import Link from 'next/link';
import Image from 'next/image';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col">
      <header className="container mx-auto px-4 py-6">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/images/IP Ventures Logomark Black.png"
            alt="IP Ventures"
            width={40}
            height={40}
            className="sm:hidden invert"
          />
          <Image
            src="/images/IP Ventures Long Logo Full Black.svg"
            alt="IP Ventures"
            width={180}
            height={48}
            className="hidden sm:block invert"
          />
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        {children}
      </main>
    </div>
  );
}
