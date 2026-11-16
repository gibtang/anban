import { NextRequest, NextResponse } from 'next/server';
import { agents, toId } from '@/lib/db/mongo';
import { verifyAuth, isUnauthorizedError, unauthorizedResponse } from '@/lib/auth/helpers';
import { getAgentCards } from '@/lib/db/agentCards';

export const runtime = 'nodejs';

/**
 * Get cards assigned to a specific agent (human auth)
 * GET /api/agents/[id]/cards
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await verifyAuth(request);
    const { id: agentId } = await params;

    // Verify agent belongs to this user
    const agent = /^[a-fA-F0-9]{24}$/.test(agentId)
      ? await agents.findOne({ _id: toId(agentId), ownerId: toId(userId) })
      : null;

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const cards = await getAgentCards(agentId, userId);

    return NextResponse.json({
      agent: { id: agent.id, name: agent.name },
      cards,
    });
  } catch (error) {
    console.error('Error fetching agent cards:', error);
    if (isUnauthorizedError(error)) {
      return unauthorizedResponse(error.message);
    }
    return NextResponse.json({ error: 'Failed to fetch agent cards' }, { status: 500 });
  }
}
