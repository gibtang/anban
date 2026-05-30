import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAgentAuth } from '@/lib/auth/helpers';

export const runtime = 'nodejs';

/**
 * Agent endpoint: list all boards the agent has approved access to
 * GET /api/agent/boards
 * Headers: Authorization: Bearer <agentToken>
 */
export async function GET(request: NextRequest) {
  try {
    const { agentId, agentName } = await verifyAgentAuth(request);

    const accesses = await prisma.boardAccess.findMany({
      where: {
        agentId,
        status: 'approved',
      },
      select: {
        boardId: true,
        approvedAt: true,
      },
      orderBy: { approvedAt: 'asc' },
    });

    const boardIds = accesses.map((a: { boardId: string }) => a.boardId);

    const boards = await prisma.board.findMany({
      where: { id: { in: boardIds } },
      select: { id: true, name: true, createdAt: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      agentId,
      agentName,
      boards,
    });
  } catch (error) {
    console.error('Error listing agent boards:', error);
    if (error instanceof Error && error.message.startsWith('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to list boards' }, { status: 500 });
  }
}
