import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projects = await prisma.project.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        isPublic: true,
        shareId: true,
        createdAt: true,
        updatedAt: true,
        projectData: true,
      },
    });

    // Extract metadata for each project
    const projectsWithMeta = projects.map((p) => {
      const data = p.projectData as Record<string, unknown> | null;
      const stage2 = (data?.stage2 as unknown[]) || [];
      const metadata = data?.metadata as Record<string, unknown> | null;

      return {
        id: p.id,
        name: p.name,
        isPublic: p.isPublic,
        shareId: p.shareId,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        shotCount: stage2.length,
        sceneCount: metadata?.totalScenes || 0,
        runtime: metadata?.estimatedRuntime || 0,
      };
    });

    return NextResponse.json(projectsWithMeta);
  } catch (error) {
    console.error('Get projects error:', error);
    return NextResponse.json(
      { error: 'Failed to get projects' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      scriptInput,
      configInput,
      projectData,
      batchProgress,
      chatMessages,
      completedPrompts,
    } = body;

    const project = await prisma.project.create({
      data: {
        userId: session.user.id,
        name: name || `Project ${new Date().toLocaleDateString()}`,
        scriptInput,
        configInput,
        projectData,
        batchProgress,
        chatMessages,
        completedPrompts,
      },
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error('Create project error:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}
