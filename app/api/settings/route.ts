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
}

interface SettingsResponse {
  boardId: string;
  openClawConnection?: {
    gatewayUrl: string;
    apiKey: string;
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

    const openClawConnection = await prisma.openClawConnection.findUnique({
      where: { boardId },
    });

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
    const { boardId, openClawConnection } = body;

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

    // Fetch updated settings
    const updatedOpenClawConnection = await prisma.openClawConnection.findUnique({
      where: { boardId },
    });

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

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating settings:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
