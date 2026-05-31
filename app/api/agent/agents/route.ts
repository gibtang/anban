import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAgentAuth } from '@/lib/auth/helpers';

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

    const agents = await prisma.agent.findMany({
      where: { ownerId, token: { not: { startsWith: '__pending__' } } },
      select: { id: true, name: true, createdAt: true },
      orderBy: { name: 'asc' },
    });

    const result = agents.map((a: { id: string; name: string; createdAt: Date }) => ({
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
    if (error instanceof Error && error.message.startsWith('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to list agents' }, { status: 500 });
  }
}
