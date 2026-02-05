import { auth } from './auth';
import { prisma } from './prisma';
import { UserRole } from '@/types';

// Check if user is admin or super admin
export async function isAdmin(): Promise<boolean> {
  const session = await auth();
  return session?.user?.role === UserRole.ADMIN ||
         session?.user?.role === UserRole.SUPER_ADMIN;
}

// Check if user is super admin
export async function isSuperAdmin(): Promise<boolean> {
  const session = await auth();
  return session?.user?.role === UserRole.SUPER_ADMIN;
}

// Get current user with admin check - throws if not admin
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  if (session.user.role !== UserRole.ADMIN &&
      session.user.role !== UserRole.SUPER_ADMIN) {
    throw new Error('Forbidden');
  }

  return session.user;
}

// Get current user with super admin check - throws if not super admin
export async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  if (session.user.role !== UserRole.SUPER_ADMIN) {
    throw new Error('Forbidden');
  }

  return session.user;
}

// Update user's last active timestamp
export async function updateLastActive(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { lastActiveAt: new Date() },
  });
}
