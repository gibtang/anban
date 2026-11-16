import { NextRequest, NextResponse } from 'next/server';
import { boards, cards, columns, openClawConnections, toId, toIdOrNull, type BoardDoc, type CardDoc, type ColumnDoc } from '@/lib/db/mongo';
import { verifyAuth, isUnauthorizedError, unauthorizedResponse } from '@/lib/auth/helpers';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** Load a board with its columns (position asc) and their cards (position asc). */
async function loadBoard(boardId: string, ownerId: string, cardsWhere?: { archived?: boolean }) {
  const oid = toIdOrNull(boardId);
  if (!oid) return null;
  const board = await boards.findOne({ _id: oid, ownerId: toId(ownerId) });
  if (!board) return null;

  const columnDocs = await columns.find({ boardId: oid }, { sort: { position: 1 } });
  const cardFilter = { boardId: oid, ...(cardsWhere ?? {}) };
  const cardDocs = await cards.find(cardFilter, { sort: { position: 1 } });
  const cardsByColumn = new Map<string, CardDoc[]>();
  for (const card of cardDocs) {
    const list = cardsByColumn.get(card.columnId) ?? [];
    list.push(card);
    cardsByColumn.set(card.columnId, list);
  }
  const withCards: (ColumnDoc & { cards: CardDoc[] })[] = columnDocs.map((c) => ({
    ...c,
    cards: cardsByColumn.get(c.id) ?? [],
  }));
  return { ...board, columns: withCards };
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const userId = await verifyAuth(request);

    const { id } = await context.params;

    // Fetch board with columns and their non-archived cards
    const board = await loadBoard(id, userId, { archived: false });

    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    // Fix orphaned cards: cards with boardId matching but columnId not in any column
    const columnIds = board.columns.map((c: { id: string }) => c.id);
    if (columnIds.length > 0) {
      const orphanedCards = await cards.find({
        boardId: toId(id),
        columnId: { $nin: columnIds.map(toId) },
      });

      if (orphanedCards.length > 0) {
        // Reassign to first column (usually "To Do")
        const defaultColumnId = columnIds[0];
        await Promise.all(
          orphanedCards.map((c: { id: string }) =>
            cards.updateOne(
              { _id: toId(c.id) },
              { $set: { columnId: toId(defaultColumnId), updatedAt: new Date() } }
            )
          )
        );

        // Re-fetch to include repaired cards
        const repaired = await loadBoard(id, userId);
        return NextResponse.json(repaired);
      }
    }

    return NextResponse.json(board);
  } catch (error) {
    console.error('Error fetching board:', error);
    if (isUnauthorizedError(error)) {
      return unauthorizedResponse(error.message);
    }
    return NextResponse.json({ error: 'Failed to fetch board' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const userId = await verifyAuth(request);

    const { id } = await context.params;
    const boardOid = toIdOrNull(id);
    if (!boardOid) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }
    const body = await request.json();
    const { name, columnOrder, favorited, archived } = body;

    // Verify board ownership
    const existingBoard = await boards.findOne({
      _id: boardOid,
      ownerId: toId(userId),
    });

    if (!existingBoard) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    // Update board
    const updateData: { name?: string; favorited?: boolean; archived?: boolean } = {};
    if (name && typeof name === 'string' && name.trim().length > 0) {
      updateData.name = name.trim();
    }
    if (favorited !== undefined && typeof favorited === 'boolean') {
      updateData.favorited = favorited;
    }
    if (archived !== undefined && typeof archived === 'boolean') {
      updateData.archived = archived;
    }

    await boards.updateOne(
      { _id: boardOid },
      { $set: { ...updateData, updatedAt: new Date() } }
    );
    const board: BoardDoc | null = await boards.findOne({ _id: boardOid });

    // Update column positions if provided
    if (columnOrder && Array.isArray(columnOrder)) {
      await Promise.all(
        columnOrder.map((columnId: string, index: number) =>
          columns.updateOne(
            { _id: toId(columnId) },
            { $set: { position: index } }
          )
        )
      );
    }

    return NextResponse.json(board);
  } catch (error) {
    console.error('Error updating board:', error);
    if (isUnauthorizedError(error)) {
      return unauthorizedResponse(error.message);
    }
    return NextResponse.json({ error: 'Failed to update board' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const userId = await verifyAuth(request);

    const { id } = await context.params;
    const boardOid = toIdOrNull(id);
    if (!boardOid) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    // Verify board ownership before deletion
    const existingBoard = await boards.findOne({
      _id: boardOid,
      ownerId: toId(userId),
    });

    if (!existingBoard) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    // Manually delete related records (MongoDB doesn't cascade)
    const boardColumns = await columns.find({ boardId: boardOid });
    const boardCards = await cards.find({ boardId: boardOid });
    const boardConnections = await openClawConnections.find({ boardId: boardOid });

    await Promise.all([
      // Delete cards
      ...boardCards.map((c) => cards.deleteOne({ _id: toId(c.id) })),
      // Delete columns
      ...boardColumns.map((c) => columns.deleteOne({ _id: toId(c.id) })),
      // Delete OpenClaw connections
      ...boardConnections.map((c) => openClawConnections.deleteOne({ _id: toId(c.id) })),
    ]);

    // Delete board
    await boards.deleteOne({ _id: boardOid });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting board:', error);
    if (isUnauthorizedError(error)) {
      return unauthorizedResponse(error.message);
    }
    return NextResponse.json({ error: 'Failed to delete board' }, { status: 500 });
  }
}
