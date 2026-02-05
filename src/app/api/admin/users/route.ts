import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin or super admin
    if (session.user.role !== UserRole.ADMIN &&
        session.user.role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';

    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { name: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          lastActiveAt: true,
          _count: {
            select: {
              projects: true,
              history: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    // Get token usage for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const tokenStats = await prisma.generationHistory.aggregate({
          where: { userId: user.id },
          _sum: { tokensUsed: true },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.createdAt,
          lastActiveAt: user.lastActiveAt,
          projectCount: user._count.projects,
          generationCount: user._count.history,
          totalTokensUsed: tokenStats._sum.tokensUsed || 0,
        };
      })
    );

    // Get aggregate stats
    const stats = {
      totalUsers: total,
      totalProjects: await prisma.project.count(),
      totalGenerations: await prisma.generationHistory.count(),
      usersThisMonth: await prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setDate(1)),
          },
        },
      }),
    };

    return NextResponse.json({
      users: usersWithStats,
      stats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get admin users error:', error);
    return NextResponse.json(
      { error: 'Failed to get users' },
      { status: 500 }
    );
  }
}
