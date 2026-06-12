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
 * Agent endpoint: update a card (move column, update description, etc.)
 * PUT /api/agent/cards/:cardId
 * Body: { boardId, title?, description?, columnId?, tags?, archived? }
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { agentId, agentName } = await verifyAgentAuth(request);
    const { id: cardId } = await context.params;

    const body = await request.json();
    const { boardId, title, description, columnId, tags, archived } = body;

    if (!boardId) {
      return NextResponse.json({ error: 'boardId is required' }, { status: 400 });
    }


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
          ...(archived !== undefined && { archived }),
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

      // Audit trail for column move
      await logAuditEvent({
        agentId,
        action: 'UPDATE',
        entityType: 'Card',
        entityId: cardId,
        oldValues: {
          title: existingCard.title,
          description: existingCard.description,
          columnId: existingCard.columnId,
          position: existingCard.position,
          tags: existingCard.tags,
          archived: (existingCard as any).archived ?? false,
        },
        newValues: {
          title: updatedCard.title,
          description: updatedCard.description,
          columnId: updatedCard.columnId,
          position: updatedCard.position,
          tags: updatedCard.tags,
          archived: (updatedCard as any).archived ?? false,
        },
      });

      // Log activity
      const fromCol = await prisma.column.findUnique({ where: { id: existingCard.columnId } });
      const toCol = await prisma.column.findUnique({ where: { id: columnId } });
      await logActivity({
        cardId,
        boardId,
        type: 'moved',
        authorId: agentId,
        authorName: agentName,
        authorType: 'agent',
        details: {
          fromColumn: fromCol?.name ?? existingCard.columnId,
          toColumn: toCol?.name ?? columnId,
        },
      });

      return NextResponse.json(updatedCard);
    }

    // Simple update (no column move)
    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (tags !== undefined) updateData.tags = tags;
    if (archived !== undefined) updateData.archived = archived;

    const updatedCard = await prisma.card.update({
      where: { id: cardId },
      data: updateData,
    });

    // Audit trail for simple update
    const hasChanges = Object.keys(updateData).length > 0;
    if (hasChanges) {
      await logAuditEvent({
        agentId,
        action: 'UPDATE',
        entityType: 'Card',
        entityId: cardId,
        oldValues: {
          title: existingCard.title,
          description: existingCard.description,
          tags: existingCard.tags,
          archived: (existingCard as any).archived ?? false,
        },
        newValues: {
          title: updatedCard.title,
          description: updatedCard.description,
          tags: updatedCard.tags,
          archived: (updatedCard as any).archived ?? false,
        },
      });
    }

    // Emit real-time event
    eventBus.emitEvent({
      type: 'card.updated',
      boardId,
      cardId,
    });

    // Log activity for field updates
    const fieldsChanged: string[] = [];
    if (title !== undefined && existingCard.title !== title.trim()) fieldsChanged.push('title');
    if (description !== undefined && existingCard.description !== (description?.trim() || null)) fieldsChanged.push('description');
    if (tags !== undefined && JSON.stringify(existingCard.tags) !== JSON.stringify(tags)) fieldsChanged.push('tags');
    if (archived !== undefined && (existingCard as any).archived !== archived) fieldsChanged.push('archived');
    if (fieldsChanged.length > 0) {
      await logActivity({
        cardId,
        boardId,
        type: 'updated',
        authorId: agentId,
        authorName: agentName,
        authorType: 'agent',
        details: { fields: fieldsChanged },
      });
    }

    return NextResponse.json(updatedCard);
  } catch (error) {
    console.error('Error in agent card update:', error);
    if (error instanceof Error && error.message.startsWith('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof Error && error.message.startsWith('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to update card' }, { status: 500 });
  }
}
