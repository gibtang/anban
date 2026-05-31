import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAgentAuth } from '@/lib/auth/helpers';

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

    const boards = await prisma.board.findMany({
      where: { ownerId },
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
