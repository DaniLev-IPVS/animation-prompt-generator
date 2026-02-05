import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@/types';

// GET single user details (for super admin viewing another user's details and projects)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        lastActiveAt: true,
        settings: {
          select: {
            anthropicApiKey: true,
          },
        },
        projects: {
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            name: true,
            createdAt: true,
            updatedAt: true,
            isPublic: true,
            projectData: true,
          },
        },
        _count: {
          select: {
            projects: true,
            history: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const tokenStats = await prisma.generationHistory.aggregate({
      where: { userId: id },
      _sum: { tokensUsed: true },
    });

    // Calculate project stats
    const projectsWithStats = user.projects.map((project) => {
      const data = project.projectData as { stage2?: unknown[]; metadata?: { totalScenes?: number; estimatedRuntime?: number } } | null;
      return {
        id: project.id,
        name: project.name,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        isPublic: project.isPublic,
        shotCount: Array.isArray(data?.stage2) ? data.stage2.length : 0,
        sceneCount: data?.metadata?.totalScenes || 0,
        runtime: data?.metadata?.estimatedRuntime || 0,
      };
    });

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      lastActiveAt: user.lastActiveAt,
      projectCount: user._count.projects,
      generationCount: user._count.history,
      totalTokensUsed: tokenStats._sum.tokensUsed || 0,
      hasApiKey: !!user.settings?.anthropicApiKey,
      projects: projectsWithStats,
    });
  } catch (error) {
    console.error('Get user details error:', error);
    return NextResponse.json(
      { error: 'Failed to get user' },
      { status: 500 }
    );
  }
}

// PATCH - Update user role (super admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only super admin can modify users
    if (session.user.role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { role, anthropicApiKey } = body;

    // Handle role update
    if (role !== undefined) {
      // Prevent self-modification for role
      if (id === session.user.id) {
        return NextResponse.json(
          { error: 'Cannot modify your own role' },
          { status: 400 }
        );
      }

      // Validate role value
      if (!Object.values(UserRole).includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }

      const user = await prisma.user.update({
        where: { id },
        data: { role },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      });

      return NextResponse.json(user);
    }

    // Handle API key update
    if (anthropicApiKey !== undefined) {
      // Upsert the user settings with the new API key
      await prisma.userSettings.upsert({
        where: { userId: id },
        update: { anthropicApiKey },
        create: {
          userId: id,
          anthropicApiKey,
        },
      });

      return NextResponse.json({ success: true, hasApiKey: !!anthropicApiKey });
    }

    return NextResponse.json({ error: 'No valid update provided' }, { status: 400 });
  } catch (error) {
    console.error('Update user role error:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}
