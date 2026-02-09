import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@/types';

// GET - Super admin can view any project
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

    if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error('Admin get project error:', error);
    return NextResponse.json(
      { error: 'Failed to get project' },
      { status: 500 }
    );
  }
}

// PUT - Admin/Super admin can edit any project
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existingProject = await prisma.project.findUnique({
      where: { id },
    });

    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
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

    const project = await prisma.project.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existingProject.name,
        scriptInput: scriptInput !== undefined ? scriptInput : existingProject.scriptInput,
        configInput: configInput !== undefined ? configInput : existingProject.configInput,
        projectData: projectData !== undefined ? projectData : existingProject.projectData,
        batchProgress: batchProgress !== undefined ? batchProgress : existingProject.batchProgress,
        chatMessages: chatMessages !== undefined ? chatMessages : existingProject.chatMessages,
        completedPrompts: completedPrompts !== undefined ? completedPrompts : existingProject.completedPrompts,
      },
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error('Admin update project error:', error);
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    );
  }
}
