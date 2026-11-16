import { NextRequest, NextResponse } from 'next/server';
import { verifyAgentAuth, isUnauthorizedError, unauthorizedResponse } from '@/lib/auth/helpers';
import { getAgentCards } from '@/lib/db/agentCards';
import { logAuditEvent } from '@/lib/db/audit';
import { logActivity } from '@/lib/db/activity';
import { cards, columns, toId } from '@/lib/db/mongo';

export const runtime = 'nodejs';

/**
 * Agent endpoint: list cards assigned to an agent
 * GET /api/agent/cards
 * Headers: Authorization: Bearer <agentToken>
 * Query params:
 *   - boardId (optional): scope to a specific board
 *   - agentId (optional): scope to a specific agent (defaults to calling agent)
 */
export async function GET(request: NextRequest) {
  try {
    const { agentId: callerAgentId, ownerId } = await verifyAgentAuth(request);

    if (!ownerId) {
      return NextResponse.json({ error: 'Agent not linked to an account' }, { status: 400 });
    }

    const boardId = request.nextUrl.searchParams.get('boardId') || undefined;
    const agentId = request.nextUrl.searchParams.get('agentId') || callerAgentId;

    const cards = await getAgentCards(agentId, ownerId, boardId);

    return NextResponse.json({ agentId, cards });
  } catch (error) {
    console.error('Error listing agent cards:', error);
    if (isUnauthorizedError(error)) {
      return unauthorizedResponse(error.message);
    }
    if (error instanceof Error && error.message === 'Invalid boardId format') {
      return NextResponse.json({ error: error.message }, { status: 400 });
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
      const todoColumn = await columns.findOne({
        boardId: toId(boardId),
        name: 'To Do',
      });
      if (todoColumn) {
        targetColumnId = todoColumn.id;
      } else {
        const newColumnId = await columns.insertOne({
          name: 'To Do',
          position: 0,
          boardId: toId(boardId),
          createdAt: new Date(),
        });
        targetColumnId = newColumnId;
      }
    }

    // Verify column belongs to this board
    const column = await columns.findOne({
      _id: toId(targetColumnId),
      boardId: toId(boardId),
    });
    if (!column) {
      return NextResponse.json({ error: 'Column not found on this board' }, { status: 400 });
    }

    // Get next position
    const maxPosCards = await cards.find(
      { columnId: toId(targetColumnId) },
      { sort: { position: -1 }, limit: 1 }
    );
    const position = maxPosCards.length > 0 ? maxPosCards[0].position + 1 : 0;

    const now = new Date();
    const cardId = await cards.insertOne({
      title: title.trim(),
      description: description?.trim() || null,
      columnId: toId(targetColumnId),
      boardId: toId(boardId),
      tags: tags || [],
      position,
      agentId: null,
      blocked: null,
      archived: false,
      createdAt: now,
      updatedAt: now,
    });
    const card = (await cards.findOne({ _id: toId(cardId) }))!;

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
    if (isUnauthorizedError(error)) {
      return unauthorizedResponse(error.message);
    }
    if (error instanceof Error && error.message.startsWith('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to create card' }, { status: 500 });
  }
}
