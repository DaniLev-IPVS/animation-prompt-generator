import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import type { AnthropicRequest, AnthropicResponse } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await prisma.userSettings.findUnique({
      where: { userId: session.user.id },
    });

    if (!settings?.anthropicApiKey) {
      return NextResponse.json(
        { error: 'Please add your Anthropic API key in settings' },
        { status: 400 }
      );
    }

    let apiKey: string;
    try {
      apiKey = decrypt(settings.anthropicApiKey);
    } catch {
      return NextResponse.json(
        { error: 'Invalid API key. Please update your API key in settings.' },
        { status: 400 }
      );
    }

    const body: AnthropicRequest & { projectId?: string; stage?: string } = await request.json();
    const { projectId, stage, ...anthropicBody } = body;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(anthropicBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error?.message || 'Anthropic API error' },
        { status: response.status }
      );
    }

    const data: AnthropicResponse = await response.json();

    // Log to generation history
    if (stage) {
      await prisma.generationHistory.create({
        data: {
          userId: session.user.id,
          projectId: projectId || null,
          stage,
          prompt: JSON.stringify(anthropicBody.messages),
          response: data.content?.[0]?.text || '',
          tokensUsed: data.usage
            ? data.usage.input_tokens + data.usage.output_tokens
            : null,
        },
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Anthropic API error:', error);
    return NextResponse.json(
      { error: 'Failed to call Anthropic API' },
      { status: 500 }
    );
  }
}
