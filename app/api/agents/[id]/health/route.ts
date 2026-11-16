import { NextRequest, NextResponse } from 'next/server';
import { agentConfigs, boards, openClawConnections, toId } from '@/lib/db/mongo';
import { verifyAuth, isUnauthorizedError, unauthorizedResponse } from '@/lib/auth/helpers';
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
    const userId = await verifyAuth(request);

    const { id } = await context.params;

    // Get agent config
    const agent = /^[a-fA-F0-9]{24}$/.test(id)
      ? await agentConfigs.findOne({ _id: toId(id) })
      : null;

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Get the first board's OpenClaw connection for health check
    const userBoards = await boards.find({ ownerId: toId(userId) });
    const connection = userBoards.length
      ? await openClawConnections.findOne({
          boardId: { $in: userBoards.map((b) => toId(b.id)) },
        })
      : null;

    if (!connection) {
      return NextResponse.json(
        { error: 'No OpenClaw connection configured' },
        { status: 400 }
      );
    }

    // Perform health check
    const isHealthy = await OpenClawHTTPAdapter.healthCheck({
      gatewayUrl: connection.gatewayUrl,
      apiKey: connection.apiKey ?? undefined,
    });

    return NextResponse.json({ healthy: isHealthy });
  } catch (error) {
    console.error('Error checking agent health:', error);
    if (isUnauthorizedError(error)) {
      return unauthorizedResponse(error.message);
    }
    return NextResponse.json({ healthy: false });
  }
}
