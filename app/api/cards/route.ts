import { NextRequest, NextResponse } from 'next/server';
import { boards, cards, toId, toIdOrNull, ObjectId, type CardDoc } from '@/lib/db/mongo';
import { verifyAuth, isUnauthorizedError, unauthorizedResponse } from '@/lib/auth/helpers';
import { logAuditEvent } from '@/lib/db/audit';
import { logActivity } from '@/lib/db/activity';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const userId = await verifyAuth(request);

    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get('boardId');
    const columnId = searchParams.get('columnId');
    const showArchived = searchParams.get('showArchived') === 'true';

    // Build where clause
    const where: {
      boardId?: ObjectId;
      columnId?: ObjectId;
      archived?: boolean;
    } = {};

    // Hide archived cards by default
    if (!showArchived) {
      where.archived = false;
    }

    if (boardId) {
      const boardOid = toIdOrNull(boardId);
      // Verify board ownership
      const board = boardOid
        ? await boards.findOne({ _id: boardOid, ownerId: toId(userId) })
        : null;

      if (!board || !boardOid) {
        return NextResponse.json({ error: 'Board not found' }, { status: 404 });
      }

      where.boardId = boardOid;
    }

    if (columnId) {
      const columnOid = toIdOrNull(columnId);
      if (!columnOid) {
        return NextResponse.json([]);
      }
      where.columnId = columnOid;
    }
    // Get cards
    const cardDocs = await cards.find(where, { sort: { position: 1 } });

    return NextResponse.json(cardDocs);
  } catch (error) {
    console.error('Error fetching cards:', error);
    if (isUnauthorizedError(error)) {
      return unauthorizedResponse(error.message);
    }
    return NextResponse.json({ error: 'Failed to fetch cards' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await verifyAuth(request);

    const body = await request.json();
    const { title, description, columnId, boardId, tags = [], agentId } = body;

    // Validation
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (!columnId || typeof columnId !== 'string') {
      return NextResponse.json({ error: 'Column ID is required' }, { status: 400 });
    }

    if (!boardId || typeof boardId !== 'string') {
      return NextResponse.json({ error: 'Board ID is required' }, { status: 400 });
    }

    // Verify board ownership
    const boardOid = toIdOrNull(boardId);
    const board = boardOid
      ? await boards.findOne({ _id: boardOid, ownerId: toId(userId) })
      : null;

    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    // Get the current max position in the column
    const columnOid = toIdOrNull(columnId);
    const maxPositionCard = columnOid
      ? (await cards.find({ columnId: columnOid }, { sort: { position: -1 }, limit: 1 }))[0]
      : undefined;

    const newPosition = maxPositionCard ? maxPositionCard.position + 1 : 0;

    // Create card
    const cardId = await cards.insertOne({
      title: title.trim(),
      description: description?.trim() || null,
      columnId: toId(columnId),
      boardId: toId(boardId),
      tags,
      agentId: toIdOrNull(agentId || null),
      blocked: null,
      archived: false,
      position: newPosition,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const card: CardDoc | null = await cards.findOne({ _id: toId(cardId) });

    // Log card creation
    await logAuditEvent({
      userId,
      action: 'CREATE',
      entityType: 'Card',
      entityId: cardId,
      newValues: {
        title: card?.title,
        description: card?.description ?? null,
        columnId: card?.columnId,
        boardId: card?.boardId,
        tags: card?.tags ?? [],
        agentId: card?.agentId ?? null,
        position: card?.position ?? newPosition,
      },
    });

    // Log activity
    await logActivity({
      cardId,
      boardId: card?.boardId ?? boardId,
      type: 'created',
      authorId: userId,
      authorName: 'You',
      authorType: 'user',
    });

    return NextResponse.json(card, { status: 201 });
  } catch (error) {
    console.error('Error creating card:', error);
    if (isUnauthorizedError(error)) {
      return unauthorizedResponse(error.message);
    }
    return NextResponse.json({ error: 'Failed to create card' }, { status: 500 });
  }
}
