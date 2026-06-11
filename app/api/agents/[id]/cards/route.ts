import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAuth } from '@/lib/auth/helpers';
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
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, ownerId: userId },
    });

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
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch agent cards' }, { status: 500 });
  }
}
