import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { encrypt, decrypt } from '@/lib/encryption';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await prisma.userSettings.findUnique({
      where: { userId: session.user.id },
    });

    if (!settings) {
      return NextResponse.json({
        hasApiKey: false,
        hasBackupApiKey: false,
        hasGeminiKey: false,
        defaultStyle: null,
        defaultDuration: null,
        defaultAudioType: null,
        defaultAspectRatio: null,
      });
    }

    return NextResponse.json({
      hasApiKey: !!settings.anthropicApiKey,
      apiKeyPreview: settings.anthropicApiKey
        ? `sk-ant-...${decrypt(settings.anthropicApiKey).slice(-4)}`
        : null,
      hasBackupApiKey: !!settings.anthropicApiKeyBackup,
      backupApiKeyPreview: settings.anthropicApiKeyBackup
        ? `sk-ant-...${decrypt(settings.anthropicApiKeyBackup).slice(-4)}`
        : null,
      hasGeminiKey: !!settings.geminiApiKey,
      geminiKeyPreview: settings.geminiApiKey
        ? `AIza...${decrypt(settings.geminiApiKey).slice(-4)}`
        : null,
      defaultStyle: settings.defaultStyle,
      defaultDuration: settings.defaultDuration,
      defaultAudioType: settings.defaultAudioType,
      defaultAspectRatio: settings.defaultAspectRatio,
    });
  } catch (error) {
    console.error('Get settings error:', error);
    return NextResponse.json(
      { error: 'Failed to get settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      anthropicApiKey,
      anthropicApiKeyBackup,
      geminiApiKey,
      defaultStyle,
      defaultDuration,
      defaultAudioType,
      defaultAspectRatio,
    } = body;

    const updateData: Record<string, unknown> = {};

    // Handle primary Anthropic API key
    if (anthropicApiKey !== undefined) {
      if (anthropicApiKey === null || anthropicApiKey === '') {
        updateData.anthropicApiKey = null;
      } else {
        if (!anthropicApiKey.startsWith('sk-ant-')) {
          return NextResponse.json(
            { error: 'Invalid Anthropic API key format' },
            { status: 400 }
          );
        }
        updateData.anthropicApiKey = encrypt(anthropicApiKey);
      }
    }

    // Handle backup Anthropic API key
    if (anthropicApiKeyBackup !== undefined) {
      if (anthropicApiKeyBackup === null || anthropicApiKeyBackup === '') {
        updateData.anthropicApiKeyBackup = null;
      } else {
        if (!anthropicApiKeyBackup.startsWith('sk-ant-')) {
          return NextResponse.json(
            { error: 'Invalid backup Anthropic API key format' },
            { status: 400 }
          );
        }
        updateData.anthropicApiKeyBackup = encrypt(anthropicApiKeyBackup);
      }
    }

    // Handle Gemini API key
    if (geminiApiKey !== undefined) {
      if (geminiApiKey === null || geminiApiKey === '') {
        updateData.geminiApiKey = null;
      } else {
        if (!geminiApiKey.startsWith('AIza')) {
          return NextResponse.json(
            { error: 'Invalid Gemini API key format' },
            { status: 400 }
          );
        }
        updateData.geminiApiKey = encrypt(geminiApiKey);
      }
    }

    if (defaultStyle !== undefined) updateData.defaultStyle = defaultStyle;
    if (defaultDuration !== undefined) updateData.defaultDuration = defaultDuration;
    if (defaultAudioType !== undefined) updateData.defaultAudioType = defaultAudioType;
    if (defaultAspectRatio !== undefined) updateData.defaultAspectRatio = defaultAspectRatio;

    const settings = await prisma.userSettings.upsert({
      where: { userId: session.user.id },
      update: updateData,
      create: {
        userId: session.user.id,
        ...updateData,
      },
    });

    return NextResponse.json({
      hasApiKey: !!settings.anthropicApiKey,
      apiKeyPreview: settings.anthropicApiKey
        ? `sk-ant-...${decrypt(settings.anthropicApiKey).slice(-4)}`
        : null,
      hasBackupApiKey: !!settings.anthropicApiKeyBackup,
      backupApiKeyPreview: settings.anthropicApiKeyBackup
        ? `sk-ant-...${decrypt(settings.anthropicApiKeyBackup).slice(-4)}`
        : null,
      hasGeminiKey: !!settings.geminiApiKey,
      geminiKeyPreview: settings.geminiApiKey
        ? `AIza...${decrypt(settings.geminiApiKey).slice(-4)}`
        : null,
      defaultStyle: settings.defaultStyle,
      defaultDuration: settings.defaultDuration,
      defaultAudioType: settings.defaultAudioType,
      defaultAspectRatio: settings.defaultAspectRatio,
    });
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
