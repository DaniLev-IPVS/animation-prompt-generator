import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { UserRole } from '@/types';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Check if user is admin or super admin
  if (!session?.user ||
      (session.user.role !== UserRole.ADMIN &&
       session.user.role !== UserRole.SUPER_ADMIN)) {
    redirect('/dashboard');
  }

  return <>{children}</>;
}
