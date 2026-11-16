import { NextRequest, NextResponse } from 'next/server';
import { verifyAgentAuth, isUnauthorizedError, unauthorizedResponse } from '@/lib/auth/helpers';
import { boards, toId } from '@/lib/db/mongo';

export const runtime = 'nodejs';

/**
 * Agent endpoint: list all boards on the agent's account
 * GET /api/agent/boards
 * Headers: Authorization: Bearer <agentToken>
 */
export async function GET(request: NextRequest) {
  try {
    const { agentId, agentName, ownerId } = await verifyAgentAuth(request);

    if (!ownerId) {
      return NextResponse.json({ error: 'Agent not linked to an account' }, { status: 400 });
    }

    const showArchived = request.nextUrl.searchParams.get('includeArchived') === 'true';

    const accountBoards = await boards.find(
      {
        ownerId: toId(ownerId),
        ...(showArchived ? {} : { archived: false }),
      },
      { sort: { name: 1 } }
    );

    return NextResponse.json({
      agentId,
      agentName,
      boards: accountBoards.map((b) => ({
        id: b.id,
        name: b.name,
        archived: b.archived,
        createdAt: b.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error listing agent boards:', error);
    if (isUnauthorizedError(error)) {
      return unauthorizedResponse(error.message);
    }
    return NextResponse.json({ error: 'Failed to list boards' }, { status: 500 });
  }
}
