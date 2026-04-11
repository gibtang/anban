import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyIdToken } from '@/lib/firebase/admin';
import { logAuditEvent } from '@/lib/db/audit';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('firebase-auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decodedToken = await verifyIdToken(token);
    const firebaseUid = decodedToken.uid;

    // Get user by Firebase UID
    const user = await prisma.user.findUnique({
      where: { firebaseUid },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

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
          ownerId: user.id,
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

    // Manually fetch assignees for cards that have them
    const cardsWithAssignees = await Promise.all(
      cards.map(async (card: {
        id: string;
        title: string;
        description: string | null;
        position: number;
        columnId: string;
        boardId: string;
        assigneeId: string | null;
        tags: string[];
        agentId: string | null;
        createdAt: Date;
        updatedAt: Date;
      }) => {
        if (!card.assigneeId) {
          return { ...card, assignee: null };
        }

        const assignee = await prisma.user.findUnique({
          where: { id: card.assigneeId },
          select: { id: true, firebaseUid: true },
        });

        return {
          ...card,
          assignee,
        };
      })
    );

    return NextResponse.json(cardsWithAssignees);
  } catch (error) {
    console.error('Error fetching cards:', error);
    return NextResponse.json({ error: 'Failed to fetch cards' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('firebase-auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decodedToken = await verifyIdToken(token);
    const firebaseUid = decodedToken.uid;

    // Get user by Firebase UID
    const user = await prisma.user.findUnique({
      where: { firebaseUid },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

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
        ownerId: user.id,
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
      userId: user.id,
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
    return NextResponse.json({ error: 'Failed to create card' }, { status: 500 });
  }
}
