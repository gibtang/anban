import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAgentAuth } from '@/lib/auth/helpers';
import { eventBus } from '@/lib/events/event-bus';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const runtime = 'nodejs';

/**
 * Agent endpoint: update a card (move column, update description, etc.)
 * Used by agents to mark tasks as complete by moving to "Done" column
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { boardId } = await verifyAgentAuth(request);
    const { id: cardId } = await context.params;

    const body = await request.json();
    const { title, description, columnId, tags } = body;

    // Verify card belongs to this board
    const existingCard = await prisma.card.findFirst({
      where: { id: cardId, boardId },
    });

    if (!existingCard) {
      return NextResponse.json({ error: 'Card not found on this board' }, { status: 404 });
    }

    // If moving to a new column, verify it belongs to this board
    if (columnId && columnId !== existingCard.columnId) {
      const targetColumn = await prisma.column.findFirst({
        where: { id: columnId, boardId },
      });
      if (!targetColumn) {
        return NextResponse.json({ error: 'Target column not found on this board' }, { status: 400 });
      }

      // Get next position in target column
      const maxPosCard = await prisma.card.findFirst({
        where: { columnId },
        orderBy: { position: 'desc' },
      });
      const newPosition = maxPosCard ? maxPosCard.position + 1 : 0;

      const updatedCard = await prisma.card.update({
        where: { id: cardId },
        data: {
          columnId,
          position: newPosition,
          ...(title !== undefined && { title: title.trim() }),
          ...(description !== undefined && { description: description?.trim() || null }),
          ...(tags !== undefined && { tags }),
        },
      });

      // Emit real-time event
      eventBus.emitEvent({
        type: 'card.moved',
        boardId,
        cardId,
        fromColumnId: existingCard.columnId,
        toColumnId: columnId,
      });

      return NextResponse.json(updatedCard);
    }

    // Simple update (no column move)
    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (tags !== undefined) updateData.tags = tags;

    const updatedCard = await prisma.card.update({
      where: { id: cardId },
      data: updateData,
    });

    // Emit real-time event
    eventBus.emitEvent({
      type: 'card.updated',
      boardId,
      cardId,
    });

    return NextResponse.json(updatedCard);
  } catch (error) {
    console.error('Error in agent card update:', error);
    if (error instanceof Error && error.message.startsWith('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to update card' }, { status: 500 });
  }
}
