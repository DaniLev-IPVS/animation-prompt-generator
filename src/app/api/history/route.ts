import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const projectId = searchParams.get('projectId');

    const where = {
      userId: session.user.id,
      ...(projectId ? { projectId } : {}),
    };

    const [history, total] = await Promise.all([
      prisma.generationHistory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          projectId: true,
          stage: true,
          prompt: true,
          response: true,
          tokensUsed: true,
          createdAt: true,
        },
      }),
      prisma.generationHistory.count({ where }),
    ]);

    // Calculate total tokens used
    const totalTokens = await prisma.generationHistory.aggregate({
      where: { userId: session.user.id },
      _sum: { tokensUsed: true },
    });

    return NextResponse.json({
      history,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        totalGenerations: total,
        totalTokensUsed: totalTokens._sum.tokensUsed || 0,
      },
    });
  } catch (error) {
    console.error('Get history error:', error);
    return NextResponse.json(
      { error: 'Failed to get history' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (id) {
      // Delete single entry
      await prisma.generationHistory.deleteMany({
        where: {
          id,
          userId: session.user.id,
        },
      });
    } else {
      // Clear all history
      await prisma.generationHistory.deleteMany({
        where: { userId: session.user.id },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete history error:', error);
    return NextResponse.json(
      { error: 'Failed to delete history' },
      { status: 500 }
    );
  }
}
