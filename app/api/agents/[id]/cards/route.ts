import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAuth } from '@/lib/auth/helpers';

export const runtime = 'nodejs';

/**
 * Get cards assigned to a specific agent
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

    // Get cards assigned to this agent with board and column info
    const cards = await prisma.card.findMany({
      where: { agentId },
      include: {
        board: { select: { id: true, name: true, archived: true } },
        column: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formattedCards = cards.map((card: any) => ({
      id: card.id,
      title: card.title,
      description: card.description,
      tags: card.tags,
      position: card.position,
      boardId: card.boardId,
      boardName: card.board.name,
      boardArchived: card.board.archived,
      columnId: card.columnId,
      columnName: card.column.name,
      createdAt: card.createdAt.toISOString(),
      updatedAt: card.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      agent: { id: agent.id, name: agent.name },
      cards: formattedCards,
    });
  } catch (error) {
    console.error('Error fetching agent cards:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch agent cards' }, { status: 500 });
  }
}
