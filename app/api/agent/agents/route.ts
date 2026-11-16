import { NextRequest, NextResponse } from 'next/server';
import { verifyAgentAuth, isUnauthorizedError, unauthorizedResponse } from '@/lib/auth/helpers';
import { agents, toId } from '@/lib/db/mongo';

export const runtime = 'nodejs';

/**
 * Agent endpoint: list all agents on the account
 * GET /api/agent/agents
 * Headers: Authorization: Bearer <agentToken>
 */
export async function GET(request: NextRequest) {
  try {
    const { agentId: callingAgentId, agentName, ownerId } = await verifyAgentAuth(request);

    if (!ownerId) {
      return NextResponse.json({ error: 'Agent not linked to an account' }, { status: 400 });
    }

    const agentDocs = await agents.find(
      {
        ownerId: toId(ownerId),
        token: { $not: { $regex: '^__pending__' } },
      },
      { sort: { name: 1 } }
    );

    const result = agentDocs.map((a) => ({
      id: a.id,
      name: a.name,
      approvedAt: a.createdAt,
      isSelf: a.id === callingAgentId,
    }));

    return NextResponse.json({
      callingAgent: agentName,
      agents: result,
    });
  } catch (error) {
    console.error('Error listing agents:', error);
    if (isUnauthorizedError(error)) {
      return unauthorizedResponse(error.message);
    }
    return NextResponse.json({ error: 'Failed to list agents' }, { status: 500 });
  }
}
