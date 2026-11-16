import { NextRequest, NextResponse } from 'next/server';
import { boards, cards, toId, toIdOrNull } from '@/lib/db/mongo';
import { verifyAuth, isUnauthorizedError, unauthorizedResponse } from '@/lib/auth/helpers';

export async function GET(request: NextRequest) {
  try {
    const userId = await verifyAuth(request);
    const boardId = request.nextUrl.searchParams.get('boardId');

    if (!boardId) {
      return NextResponse.json({ error: 'boardId is required' }, { status: 400 });
    }

    // Verify board ownership
    const boardOid = toIdOrNull(boardId);
    const board = boardOid
      ? await boards.findOne({ _id: boardOid, ownerId: toId(userId) })
      : null;

    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    const archivedCards = await cards.find(
      { boardId: boardOid, archived: true },
      { sort: { updatedAt: -1 } }
    );

    return NextResponse.json(archivedCards);
  } catch (error) {
    console.error('Error fetching archived cards:', error);
    if (isUnauthorizedError(error)) {
      return unauthorizedResponse(error.message);
    }
    return NextResponse.json({ error: 'Failed to fetch archived cards' }, { status: 500 });
  }
}
