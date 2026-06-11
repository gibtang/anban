import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAuth } from '@/lib/auth/helpers';
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
      boardId?: string;
      columnId?: string;
      archived?: boolean;
    } = {};

    // Hide archived cards by default
    if (!showArchived) {
      where.archived = false;
    }

    if (boardId) {
      // Verify board ownership
      const board = await prisma.board.findFirst({
        where: {
          id: boardId,
          ownerId: userId,
        },
      });

      if (!board) {
        return NextResponse.json({ error: 'Board not found' }, { status: 404 });
      }

      where.boardId = boardId;
    }

    if (columnId) {
      where.columnId = columnId;
    }

    // Get cards
    const cards = await prisma.card.findMany({
      where,
      orderBy: { position: 'asc' },
    });

    return NextResponse.json(cards);
  } catch (error) {
    console.error('Error fetching cards:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    const board = await prisma.board.findFirst({
      where: {
        id: boardId,
        ownerId: userId,
      },
    });

    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    // Get the current max position in the column
    const maxPositionCard = await prisma.card.findFirst({
      where: { columnId },
      orderBy: { position: 'desc' },
    });

    const newPosition = maxPositionCard ? maxPositionCard.position + 1 : 0;

    // Create card
    const card = await prisma.card.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        columnId,
        boardId,
        tags,
        agentId: agentId || null,
        position: newPosition,
      },
    });

    // Log card creation
    await logAuditEvent({
      userId,
      action: 'CREATE',
      entityType: 'Card',
      entityId: card.id,
      newValues: {
        title: card.title,
        description: card.description,
        columnId: card.columnId,
        boardId: card.boardId,
        tags: card.tags,
        agentId: card.agentId,
        position: card.position,
      },
    });

    // Log activity
    await logActivity({
      cardId: card.id,
      boardId: card.boardId,
      type: 'created',
      authorId: userId,
      authorName: 'You',
      authorType: 'user',
    });

    return NextResponse.json(card, { status: 201 });
  } catch (error) {
    console.error('Error creating card:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to create card' }, { status: 500 });
  }
}
