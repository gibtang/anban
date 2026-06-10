import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAgentAuth } from '@/lib/auth/helpers';
import { logAuditEvent } from '@/lib/db/audit';
import { logActivity } from '@/lib/db/activity';

export const runtime = 'nodejs';

/**
 * Agent endpoint: list cards assigned to an agent
 * GET /api/agent/cards
 * Headers: Authorization: Bearer <agentToken>
 * Query params:
 *   - boardId (optional): scope to a specific board
 *   - agentId (optional): scope to a specific agent (defaults to calling agent)
 *
 * Returns cards with board and column info so the agent knows where each card lives.
 */
export async function GET(request: NextRequest) {
  try {
    const { agentId: callerAgentId, ownerId } = await verifyAgentAuth(request);

    if (!ownerId) {
      return NextResponse.json({ error: 'Agent not linked to an account' }, { status: 400 });
    }

    const boardId = request.nextUrl.searchParams.get('boardId') || undefined;
    const agentId = request.nextUrl.searchParams.get('agentId') || callerAgentId;

    // Validate boardId format (24-char hex for MongoDB ObjectId)
    if (boardId && !/^[a-fA-F0-9]{24}$/.test(boardId)) {
      return NextResponse.json({ error: 'Invalid boardId format' }, { status: 400 });
    }

    // Get all board IDs on this account
    const accountBoards = await prisma.board.findMany({
      where: {
        ownerId,
        archived: false,
        ...(boardId ? { id: boardId } : {}),
      },
      select: { id: true, name: true },
    });

    const boardIds = accountBoards.map((b: { id: string }) => b.id);
    const boardNameMap = new Map(accountBoards.map((b: { id: string; name: string }) => [b.id, b.name]));

    if (boardIds.length === 0) {
      return NextResponse.json({ cards: [] });
    }

    // Find cards assigned to this agent across all account boards
    const cards = await prisma.card.findMany({
      where: {
        agentId,
        boardId: { in: boardIds },
      },
      include: {
        column: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Enrich with board name
    const result = cards.map((card: { id: string; title: string; description: string | null; tags: string[]; position: number; boardId: string; columnId: string; agentId: string | null; createdAt: Date; updatedAt: Date; column: { id: string; name: string } }) => ({
      id: card.id,
      title: card.title,
      description: card.description,
      tags: card.tags,
      position: card.position,
      boardId: card.boardId,
      boardName: boardNameMap.get(card.boardId) || 'Unknown',
      columnId: card.columnId,
      columnName: card.column.name,
      agentId: card.agentId,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
    }));

    return NextResponse.json({ agentId, cards: result });
  } catch (error) {
    console.error('Error listing agent cards:', error);
    if (error instanceof Error && error.message.startsWith('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to list cards' }, { status: 500 });
  }
}

/**
 * Agent endpoint: create a card on a board
 * POST /api/agent/cards
 * Body: { boardId, title, description?, columnId?, tags? }
 */
export async function POST(request: NextRequest) {
  try {
    const { agentId, agentName } = await verifyAgentAuth(request);

    const body = await request.json();
    const { boardId, title, description, columnId, tags } = body;

    if (!boardId) {
      return NextResponse.json({ error: 'boardId is required' }, { status: 400 });
    }

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }


    // If no column specified, find or create "To Do" column
    let targetColumnId = columnId;
    if (!targetColumnId) {
      const todoColumn = await prisma.column.findFirst({
        where: { boardId, name: 'To Do' },
      });
      if (todoColumn) {
        targetColumnId = todoColumn.id;
      } else {
        const newColumn = await prisma.column.create({
          data: { name: 'To Do', position: 0, boardId },
        });
        targetColumnId = newColumn.id;
      }
    }

    // Verify column belongs to this board
    const column = await prisma.column.findFirst({
      where: { id: targetColumnId, boardId },
    });
    if (!column) {
      return NextResponse.json({ error: 'Column not found on this board' }, { status: 400 });
    }

    // Get next position
    const maxPosCard = await prisma.card.findFirst({
      where: { columnId: targetColumnId },
      orderBy: { position: 'desc' },
    });
    const position = maxPosCard ? maxPosCard.position + 1 : 0;

    const card = await prisma.card.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        columnId: targetColumnId,
        boardId,
        tags: tags || [],
        position,
      },
    });

    // Audit trail
    await logAuditEvent({
      agentId,
      action: 'CREATE',
      entityType: 'Card',
      entityId: card.id,
      newValues: {
        title: card.title,
        description: card.description,
        columnId: card.columnId,
        boardId: card.boardId,
        tags: card.tags,
        position: card.position,
      },
    });

    // Log activity
    await logActivity({
      cardId: card.id,
      boardId: card.boardId,
      type: 'created',
      authorId: agentId,
      authorName: agentName,
      authorType: 'agent',
    });

    return NextResponse.json(card, { status: 201 });
  } catch (error) {
    console.error('Error in agent card creation:', error);
    if (error instanceof Error && error.message.startsWith('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof Error && error.message.startsWith('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to create card' }, { status: 500 });
  }
}
