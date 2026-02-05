import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find the first user (typically the owner/creator)
  const firstUser = await prisma.user.findFirst({
    orderBy: { createdAt: 'asc' },
  });

  if (firstUser) {
    await prisma.user.update({
      where: { id: firstUser.id },
      data: { role: 'SUPER_ADMIN' },
    });
    console.log(`Set ${firstUser.email} as SUPER_ADMIN`);
  } else {
    console.log('No users found in database');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
