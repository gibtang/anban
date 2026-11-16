import { NextRequest, NextResponse } from 'next/server';
import { verifyAgentAuth, isUnauthorizedError, unauthorizedResponse } from '@/lib/auth/helpers';
import { boards, cards, columns, toId } from '@/lib/db/mongo';

export const runtime = 'nodejs';

/**
 * Agent endpoint: read board data (columns + cards)
 * GET /api/agent/board?boardId=xxx
 * Requires Bearer token from approved Agent account
 */
export async function GET(request: NextRequest) {
  try {
    const { agentId } = await verifyAgentAuth(request);

    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get('boardId');

    if (!boardId) {
      return NextResponse.json({ error: 'boardId query parameter is required' }, { status: 400 });
    }


    const board = await boards.findOne({ _id: toId(boardId) });

    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    // Nested include (board -> columns -> cards) as separate finds, grouped in JS
    const boardColumns = await columns.find(
      { boardId: toId(boardId) },
      { sort: { position: 1 } }
    );
    const columnsWithCards = await Promise.all(
      boardColumns.map(async (col) => {
        const colCards = await cards.find(
          { columnId: toId(col.id), archived: false },
          { sort: { position: 1 } }
        );
        return { ...col, cards: colCards };
      })
    );

    return NextResponse.json({ ...board, columns: columnsWithCards });
  } catch (error) {
    console.error('Error in agent board endpoint:', error);
    if (isUnauthorizedError(error)) {
      return unauthorizedResponse(error.message);
    }
    if (error instanceof Error && error.message.startsWith('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch board' }, { status: 500 });
  }
}
