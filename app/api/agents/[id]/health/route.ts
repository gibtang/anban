import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyIdToken } from '@/lib/firebase/admin';
import { OpenClawHTTPAdapter } from '@/lib/openclaw/http-adapter';

export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const token = request.cookies.get('firebase-auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decodedToken = await verifyIdToken(token);
    const firebaseUid = decodedToken.uid;

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { firebaseUid },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { id } = await context.params;

    // Get agent config
    const agent = await prisma.agentConfig.findUnique({
      where: { id },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Get the first board's OpenClaw connection for health check
    const board = await prisma.board.findFirst({
      where: {
        ownerId: user.id,
        openClawConnection: { isNot: null },
      },
      include: {
        openClawConnection: true,
      },
    });

    if (!board || !board.openClawConnection) {
      return NextResponse.json(
        { error: 'No OpenClaw connection configured' },
        { status: 400 }
      );
    }

    // Perform health check
    const isHealthy = await OpenClawHTTPAdapter.healthCheck({
      gatewayUrl: board.openClawConnection.gatewayUrl,
      apiKey: board.openClawConnection.apiKey ?? undefined,
    });

    return NextResponse.json({ healthy: isHealthy });
  } catch (error) {
    console.error('Error checking agent health:', error);
    return NextResponse.json({ healthy: false });
  }
}
