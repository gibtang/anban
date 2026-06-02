import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAgentAuth } from '@/lib/auth/helpers';
import { eventBus } from '@/lib/events/event-bus';
import { logActivity } from '@/lib/db/activity';
import { logAuditEvent } from '@/lib/db/audit';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const runtime = 'nodejs';

/**
 * Agent endpoint: move a card from one board to another
 * PUT /api/agent/cards/:cardId/move-board
 * Body: { sourceBoardId, targetBoardId, targetColumnId? }
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { agentId, agentName } = await verifyAgentAuth(request);
    const { id: cardId } = await context.params;

    const body = await request.json();
    const { sourceBoardId, targetBoardId, targetColumnId } = body;

    if (!sourceBoardId) {
      return NextResponse.json({ error: 'sourceBoardId is required' }, { status: 400 });
    }

    if (!targetBoardId) {
      return NextResponse.json({ error: 'targetBoardId is required' }, { status: 400 });
    }

    if (sourceBoardId === targetBoardId) {
      return NextResponse.json({ error: 'Card is already on the target board. Use PUT /api/agent/cards/:id to move between columns.' }, { status: 400 });
    }

    // Verify card exists on source board
    const existingCard = await prisma.card.findFirst({
      where: { id: cardId, boardId: sourceBoardId },
    });

    if (!existingCard) {
      return NextResponse.json({ error: 'Card not found on source board' }, { status: 404 });
    }

    // Verify target board exists
    const targetBoard = await prisma.board.findUnique({
      where: { id: targetBoardId },
      include: { columns: { orderBy: { position: 'asc' } } },
    });

    if (!targetBoard) {
      return NextResponse.json({ error: 'Target board not found' }, { status: 404 });
    }

    // Determine target column
    let resolvedColumnId = targetColumnId;
    if (resolvedColumnId) {
      // Verify the column belongs to the target board
      const targetCol = targetBoard.columns.find((c: { id: string }) => c.id === resolvedColumnId);
      if (!targetCol) {
        return NextResponse.json({ error: 'Target column not found on target board' }, { status: 400 });
      }
    } else {
      // Default to the first column (usually "To Do")
      if (targetBoard.columns.length === 0) {
        return NextResponse.json({ error: 'Target board has no columns' }, { status: 400 });
      }
      resolvedColumnId = targetBoard.columns[0].id;
    }

    // Get next position in target column
    const maxPosCard = await prisma.card.findFirst({
      where: { columnId: resolvedColumnId },
      orderBy: { position: 'desc' },
    });
    const newPosition = maxPosCard ? maxPosCard.position + 1 : 0;

    // Audit: old values
    const oldValues = {
      title: existingCard.title,
      boardId: existingCard.boardId,
      columnId: existingCard.columnId,
      position: existingCard.position,
    };

    // Move card to target board
    const updatedCard = await prisma.card.update({
      where: { id: cardId },
      data: {
        boardId: targetBoardId,
        columnId: resolvedColumnId,
        position: newPosition,
      },
    });

    // Audit: new values
    await logAuditEvent({
      agentId,
      action: 'MOVE_BOARD',
      entityType: 'Card',
      entityId: cardId,
      oldValues,
      newValues: {
        title: updatedCard.title,
        boardId: updatedCard.boardId,
        columnId: updatedCard.columnId,
        position: updatedCard.position,
      },
    });

    // Emit real-time events for both boards
    eventBus.emitEvent({
      type: 'card.deleted',
      boardId: sourceBoardId,
      cardId,
    });

    eventBus.emitEvent({
      type: 'card.created',
      boardId: targetBoardId,
      cardId,
      columnId: resolvedColumnId,
    });

    // Log activity on source board
    await logActivity({
      cardId,
      boardId: sourceBoardId,
      type: 'moved',
      authorId: agentId,
      authorName: agentName,
      authorType: 'agent',
      details: {
        fromBoard: sourceBoardId,
        toBoard: targetBoardId,
        toBoardName: targetBoard.name,
        action: 'moved_to_board',
      },
    });

    // Log activity on target board
    const targetCol = targetBoard.columns.find((c: { id: string }) => c.id === resolvedColumnId);
    await logActivity({
      cardId,
      boardId: targetBoardId,
      type: 'created',
      authorId: agentId,
      authorName: agentName,
      authorType: 'agent',
      details: {
        fromBoard: sourceBoardId,
        toColumn: targetCol?.name ?? resolvedColumnId,
        action: 'moved_from_board',
      },
    });

    return NextResponse.json({
      success: true,
      card: updatedCard,
      movedFrom: sourceBoardId,
      movedTo: targetBoardId,
    });
  } catch (error) {
    console.error('Error in agent card move-board:', error);
    if (error instanceof Error && error.message.startsWith('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof Error && error.message.startsWith('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to move card between boards' }, { status: 500 });
  }
}
