import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@/types';

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

    const isAdmin = session.user.role === UserRole.ADMIN || session.user.role === UserRole.SUPER_ADMIN;

    // Admins can view any project, regular users can only view their own
    const project = await prisma.project.findFirst({
      where: isAdmin
        ? { id }
        : { id, userId: session.user.id },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error('Get project error:', error);
    return NextResponse.json(
      { error: 'Failed to get project' },
      { status: 500 }
    );
  }
}

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

    const isAdmin = session.user.role === UserRole.ADMIN || session.user.role === UserRole.SUPER_ADMIN;

    // Admins can edit any project, regular users can only edit their own
    const existingProject = await prisma.project.findFirst({
      where: isAdmin
        ? { id }
        : { id, userId: session.user.id },
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
        scriptInput:
          scriptInput !== undefined ? scriptInput : existingProject.scriptInput,
        configInput:
          configInput !== undefined ? configInput : existingProject.configInput,
        projectData:
          projectData !== undefined ? projectData : existingProject.projectData,
        batchProgress:
          batchProgress !== undefined
            ? batchProgress
            : existingProject.batchProgress,
        chatMessages:
          chatMessages !== undefined
            ? chatMessages
            : existingProject.chatMessages,
        completedPrompts:
          completedPrompts !== undefined
            ? completedPrompts
            : existingProject.completedPrompts,
      },
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error('Update project error:', error);
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existingProject = await prisma.project.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    await prisma.project.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete project error:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}
