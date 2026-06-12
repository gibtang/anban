import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAuth } from '@/lib/auth/helpers';

export async function GET(request: NextRequest) {
  try {
    const userId = await verifyAuth(request);
    const boardId = request.nextUrl.searchParams.get('boardId');

    if (!boardId) {
      return NextResponse.json({ error: 'boardId is required' }, { status: 400 });
    }

    // Verify board ownership
    const board = await prisma.board.findFirst({
      where: { id: boardId, ownerId: userId },
    });

    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    const archivedCards = await prisma.card.findMany({
      where: { boardId, archived: true },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(archivedCards);
  } catch (error) {
    console.error('Error fetching archived cards:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch archived cards' }, { status: 500 });
  }
}
