import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAgentAuth } from '@/lib/auth/helpers';

export const runtime = 'nodejs';

/**
 * Agent endpoint: read board data (columns + cards)
 * Requires Bearer token from approved access request
 */
export async function GET(request: NextRequest) {
  try {
    const { boardId } = await verifyAgentAuth(request);

    const board = await prisma.board.findUnique({
      where: { id: boardId },
    });

    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    const columns = await prisma.column.findMany({
      where: { boardId },
      orderBy: { position: 'asc' },
    });

    const columnsWithCards = await Promise.all(
      columns.map(async (column: { id: string; name: string; position: number; boardId: string; createdAt: Date }) => {
        const cards = await prisma.card.findMany({
          where: { columnId: column.id },
          orderBy: { position: 'asc' },
        });
        return { ...column, cards };
      })
    );

    return NextResponse.json({
      id: board.id,
      name: board.name,
      columns: columnsWithCards,
    });
  } catch (error) {
    console.error('Error in agent board endpoint:', error);
    if (error instanceof Error && error.message.startsWith('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch board' }, { status: 500 });
  }
}
