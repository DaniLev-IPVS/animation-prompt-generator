import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';

export async function POST(
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

    // Generate a unique share ID if not already public
    const shareId = existingProject.shareId || randomBytes(8).toString('hex');

    const project = await prisma.project.update({
      where: { id },
      data: {
        isPublic: true,
        shareId,
      },
    });

    return NextResponse.json({
      shareId: project.shareId,
      shareUrl: `/shared/${project.shareId}`,
    });
  } catch (error) {
    console.error('Share project error:', error);
    return NextResponse.json(
      { error: 'Failed to share project' },
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

    await prisma.project.update({
      where: { id },
      data: {
        isPublic: false,
        shareId: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unshare project error:', error);
    return NextResponse.json(
      { error: 'Failed to unshare project' },
      { status: 500 }
    );
  }
}
