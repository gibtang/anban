import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAuth } from '@/lib/auth/helpers';
import { logAuditEvent } from '@/lib/db/audit';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const userId = await verifyAuth(request);

    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get('boardId');
    const columnId = searchParams.get('columnId');

    // Build where clause
    const where: {
      boardId?: string;
      columnId?: string;
    } = {};

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

    // Batch-fetch unique assignees in a single query
    const uniqueAssigneeIds = Array.from(new Set(cards.filter((c: { assigneeId: string | null }) => c.assigneeId).map((c: { assigneeId: string | null }) => c.assigneeId!)));
    const assigneeMap = new Map<string, { id: string; firebaseUid: string }>();

    if (uniqueAssigneeIds.length > 0) {
      const assignees = await prisma.user.findMany({
        where: { id: { in: uniqueAssigneeIds } },
        select: { id: true, firebaseUid: true },
      });
      for (const a of assignees) {
        assigneeMap.set(a.id, a);
      }
    }

    const cardsWithAssignees = cards.map((card: { assigneeId: string | null; [key: string]: unknown }) => ({
      ...card,
      assignee: card.assigneeId ? (assigneeMap.get(card.assigneeId) ?? null) : null,
    }));

    return NextResponse.json(cardsWithAssignees);
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
    const { title, description, columnId, boardId, assigneeId, tags = [], agentId } = body;

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
        assigneeId: assigneeId || null,
        tags,
        agentId: agentId || null,
        position: newPosition,
      },
    });

    // Manually fetch assignee if present
    let assignee = null;
    if (card.assigneeId) {
      assignee = await prisma.user.findUnique({
        where: { id: card.assigneeId },
        select: { id: true, firebaseUid: true },
      });
    }

    const cardWithAssignee = {
      ...card,
      assignee,
    };

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
        assigneeId: card.assigneeId,
        tags: card.tags,
        agentId: card.agentId,
        position: card.position,
      },
    });

    return NextResponse.json(cardWithAssignee, { status: 201 });
  } catch (error) {
    console.error('Error creating card:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to create card' }, { status: 500 });
  }
}
