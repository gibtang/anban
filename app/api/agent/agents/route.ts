import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAgentAuth } from '@/lib/auth/helpers';

export const runtime = 'nodejs';

/**
 * Agent endpoint: list all approved agents on the board
 * GET /api/agent/agents
 * Headers: Authorization: Bearer <agentToken>
 */
export async function GET(request: NextRequest) {
  try {
    const { boardId, accessId, agentName } = await verifyAgentAuth(request);

    const agents = await prisma.boardAccess.findMany({
      where: {
        boardId,
        status: 'approved',
      },
      select: {
        id: true,
        agentName: true,
        approvedAt: true,
      },
      orderBy: { approvedAt: 'asc' },
    });

    // Tag the calling agent
    const result = agents.map((agent: { id: string; agentName: string; approvedAt: Date | null }) => ({
      id: agent.id,
      name: agent.agentName,
      approvedAt: agent.approvedAt,
      isSelf: agent.id === accessId,
    }));

    return NextResponse.json({
      boardId,
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
