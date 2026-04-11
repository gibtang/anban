import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyIdToken } from '@/lib/firebase/admin';

export const runtime = 'nodejs';

interface LookupRequest {
  username: string;
}

interface LookupResponse {
  success: boolean;
  data?: {
    botId: string;
    botName: string;
    openClawConfig?: {
      gatewayUrl: string;
      apiKey: string;
      enabled: boolean;
    };
    status: 'linked' | 'not_linked';
  };
  error?: string;
}

// Validate Telegram bot username format
function isValidBotUsername(username: string): boolean {
  // Must start with @ and be at least 2 characters (e.g., @b)
  const usernameRegex = /^@[\w]{1,32}$/;
  return usernameRegex.test(username);
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('firebase-auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decodedToken = await verifyIdToken(token);
    const firebaseUid = decodedToken.uid;

    // Get user by Firebase UID
    const user = await prisma.user.findUnique({
      where: { firebaseUid },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body: LookupRequest = await request.json();
    const { username } = body;

    // Validate request
    if (!username || typeof username !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Bot username is required' },
        { status: 400 }
      );
    }

    // Validate username format
    if (!isValidBotUsername(username)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid username format. Username must start with @ and contain only letters, numbers, and underscores (e.g., @my_bot)',
        },
        { status: 400 }
      );
    }

    // Look up Telegram config by username
    const telegramConfig = await prisma.telegramConfig.findFirst({
      where: {
        username: username,
      },
    });

    if (!telegramConfig) {
      return NextResponse.json(
        {
          success: false,
          error: `Bot username ${username} not found. Please verify the bot is registered in the system.`,
        },
        { status: 404 }
      );
    }

    // Get the board associated with this Telegram config
    const board = await prisma.board.findUnique({
      where: { id: telegramConfig.boardId },
    });

    if (!board) {
      return NextResponse.json(
        {
          success: false,
          error: 'Associated board not found for this bot configuration',
        },
        { status: 404 }
      );
    }

    // Verify user has access to this board
    if (board.ownerId !== user.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'You do not have permission to access this bot configuration',
        },
        { status: 403 }
      );
    }

    // Look up associated OpenClaw connection
    const openClawConnection = await prisma.openClawConnection.findUnique({
      where: { boardId: telegramConfig.boardId },
    });

    const response: LookupResponse = {
      success: true,
      data: {
        botId: telegramConfig.id,
        botName: username,
        status: openClawConnection ? 'linked' : 'not_linked',
      },
    };

    // Include OpenClaw config if it exists
    if (openClawConnection && response.data) {
      response.data.openClawConfig = {
        gatewayUrl: openClawConnection.gatewayUrl,
        apiKey: openClawConnection.apiKey || '',
        enabled: openClawConnection.enabled,
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error looking up bot configuration:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to look up bot configuration. Please try again.',
      },
      { status: 500 }
    );
  }
}
