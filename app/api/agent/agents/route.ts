import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAgentAuth } from '@/lib/auth/helpers';

export const runtime = 'nodejs';

/**
 * Agent endpoint: list all approved agents on a board
 * GET /api/agent/agents?boardId=xxx
 * Headers: Authorization: Bearer <agentToken>
 */
export async function GET(request: NextRequest) {
  try {
    const { agentId: callingAgentId, agentName } = await verifyAgentAuth(request);

    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get('boardId');

    if (!boardId) {
      return NextResponse.json({ error: 'boardId query parameter is required' }, { status: 400 });
    }


    const accesses = await prisma.boardAccess.findMany({
      where: {
        boardId,
        status: 'approved',
      },
      select: {
        agentId: true,
        approvedAt: true,
        agent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { approvedAt: 'asc' },
    });

    const agents = accesses.map((a: { agentId: string; approvedAt: Date | null; agent: { id: string; name: string } }) => ({
      id: a.agent.id,
      name: a.agent.name,
      approvedAt: a.approvedAt,
      isSelf: a.agent.id === callingAgentId,
    }));

    return NextResponse.json({
      boardId,
      callingAgent: agentName,
      agents,
    });
  } catch (error) {
    console.error('Error listing agents:', error);
    if (error instanceof Error && error.message.startsWith('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof Error && error.message.startsWith('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to list agents' }, { status: 500 });
  }
}
