import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAuth } from '@/lib/auth/helpers';

export const runtime = 'nodejs';

interface SettingsRequest {
  boardId: string;
  openClawConnection?: {
    gatewayUrl: string;
    apiKey?: string;
    enabled?: boolean;
  };
  telegramConfig?: {
    botToken: string;
    username?: string;
    chatId?: string;
    enabled?: boolean;
  };
}

interface SettingsResponse {
  boardId: string;
  openClawConnection?: {
    gatewayUrl: string;
    apiKey: string;
    enabled: boolean;
  } | null;
  telegramConfig?: {
    botToken: string;
    username: string | null;
    chatId: string | null;
    enabled: boolean;
  } | null;
}

// Helper function to mask sensitive values
function maskSecret(value: string | null | undefined): string {
  if (!value || value === '******') return '******';
  return '******';
}

export async function GET(request: NextRequest) {
  try {
    const userId = await verifyAuth(request);

    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get('boardId');

    if (!boardId) {
      return NextResponse.json({ error: 'boardId is required' }, { status: 400 });
    }

    // Verify board ownership
    const board = await prisma.board.findFirst({
      where: {
        id: boardId,
        ownerId: userId,
      },
    });

    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    // Manually fetch connections
    const [openClawConnection, telegramConfig] = await Promise.all([
      prisma.openClawConnection.findUnique({
        where: { boardId },
      }),
      prisma.telegramConfig.findUnique({
        where: { boardId },
      }),
    ]);

    // Mask sensitive fields in response
    const response: SettingsResponse = {
      boardId: board.id,
    };

    if (openClawConnection) {
      response.openClawConnection = {
        gatewayUrl: openClawConnection.gatewayUrl,
        apiKey: maskSecret(openClawConnection.apiKey),
        enabled: openClawConnection.enabled,
      };
    } else {
      response.openClawConnection = null;
    }

    if (telegramConfig) {
      response.telegramConfig = {
        botToken: maskSecret(telegramConfig.botToken),
        username: telegramConfig.username,
        chatId: telegramConfig.chatId,
        enabled: telegramConfig.enabled,
      };
    } else {
      response.telegramConfig = null;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching settings:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await verifyAuth(request);

    const body: SettingsRequest = await request.json();
    const { boardId, openClawConnection, telegramConfig } = body;

    if (!boardId || typeof boardId !== 'string') {
      return NextResponse.json({ error: 'boardId is required' }, { status: 400 });
    }

    // Verify board ownership
    const board = await prisma.board.findFirst({
      where: {
        id: boardId,
        ownerId: userId,
      },
    });

    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    // Update OpenClaw connection if provided
    if (openClawConnection) {
      const { gatewayUrl, apiKey, enabled } = openClawConnection;

      if (!gatewayUrl || typeof gatewayUrl !== 'string' || gatewayUrl.trim().length === 0) {
        return NextResponse.json({ error: 'gatewayUrl is required for OpenClaw connection' }, { status: 400 });
      }

      // Validate URL format
      try {
        new URL(gatewayUrl);
      } catch {
        return NextResponse.json({ error: 'Invalid gatewayUrl format' }, { status: 400 });
      }

      await prisma.openClawConnection.upsert({
        where: { boardId },
        create: {
          boardId,
          gatewayUrl: gatewayUrl.trim(),
          apiKey: apiKey?.trim() || null,
          enabled: enabled !== undefined ? enabled : true,
        },
        update: {
          gatewayUrl: gatewayUrl.trim(),
          ...(apiKey !== undefined && { apiKey: apiKey.trim() }),
          ...(enabled !== undefined && { enabled }),
        },
      });
    }

    // Update Telegram config if provided
    if (telegramConfig) {
      const { botToken, username, chatId, enabled } = telegramConfig;

      if (!botToken || typeof botToken !== 'string' || botToken.trim().length === 0) {
        return NextResponse.json({ error: 'botToken is required for Telegram config' }, { status: 400 });
      }

      await prisma.telegramConfig.upsert({
        where: { boardId },
        create: {
          boardId,
          botToken: botToken.trim(),
          username: username?.trim() || null,
          chatId: chatId?.trim() || null,
          enabled: enabled !== undefined ? enabled : true,
        },
        update: {
          botToken: botToken.trim(),
          ...(username !== undefined && { username: username.trim() || null }),
          ...(chatId !== undefined && { chatId: chatId.trim() || null }),
          ...(enabled !== undefined && { enabled }),
        },
      });
    }

    // Fetch updated settings
    const [updatedOpenClawConnection, updatedTelegramConfig] = await Promise.all([
      prisma.openClawConnection.findUnique({
        where: { boardId },
      }),
      prisma.telegramConfig.findUnique({
        where: { boardId },
      }),
    ]);

    // Mask sensitive fields in response
    const response: SettingsResponse = {
      boardId: board.id,
    };

    if (updatedOpenClawConnection) {
      response.openClawConnection = {
        gatewayUrl: updatedOpenClawConnection.gatewayUrl,
        apiKey: maskSecret(updatedOpenClawConnection.apiKey),
        enabled: updatedOpenClawConnection.enabled,
      };
    } else {
      response.openClawConnection = null;
    }

    if (updatedTelegramConfig) {
      response.telegramConfig = {
        botToken: maskSecret(updatedTelegramConfig.botToken),
        username: updatedTelegramConfig.username,
        chatId: updatedTelegramConfig.chatId,
        enabled: updatedTelegramConfig.enabled,
      };
    } else {
      response.telegramConfig = null;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating settings:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
