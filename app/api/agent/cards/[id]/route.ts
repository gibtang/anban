import { NextRequest, NextResponse } from 'next/server';
import { verifyAgentAuth, isUnauthorizedError, unauthorizedResponse } from '@/lib/auth/helpers';
import { eventBus } from '@/lib/events/event-bus';
import { logActivity } from '@/lib/db/activity';
import { logAuditEvent } from '@/lib/db/audit';
import { cards, columns, toId } from '@/lib/db/mongo';

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

    if (!/^[a-fA-F0-9]{24}$/.test(cardId)) {
      return NextResponse.json({ error: 'Invalid card ID format' }, { status: 400 });
    }

    const body = await request.json();
    const { boardId, title, description, columnId, tags, blocked, archived } = body;

    if (!boardId) {
      return NextResponse.json({ error: 'boardId is required' }, { status: 400 });
    }

    if (!/^[a-fA-F0-9]{24}$/.test(boardId)) {
      return NextResponse.json({ error: 'Invalid boardId format' }, { status: 400 });
    }


    // Verify card belongs to this board
    const existingCard = await cards.findOne({
      _id: toId(cardId),
      boardId: toId(boardId),
    });

    if (!existingCard) {
      return NextResponse.json({ error: 'Card not found on this board' }, { status: 404 });
    }

    // If moving to a new column, verify it belongs to this board
    if (columnId && columnId !== existingCard.columnId) {
      const targetColumn = await columns.findOne({
        _id: toId(columnId),
        boardId: toId(boardId),
      });
      if (!targetColumn) {
        return NextResponse.json({ error: 'Target column not found on this board' }, { status: 400 });
      }

      // Get next position in target column
      const maxPosCards = await cards.find(
        { columnId: toId(columnId) },
        { sort: { position: -1 }, limit: 1 }
      );
      const newPosition = maxPosCards.length > 0 ? maxPosCards[0].position + 1 : 0;

      await cards.updateOne(
        { _id: toId(cardId) },
        {
          $set: {
            columnId: toId(columnId),
            position: newPosition,
            updatedAt: new Date(),
            ...(title !== undefined && { title: title.trim() }),
            ...(description !== undefined && { description: description?.trim() || null }),
            ...(tags !== undefined && { tags }),
            ...(blocked !== undefined && { blocked: blocked || null }),
            ...(archived !== undefined && { archived }),
          },
        },
      );
      const updatedCard = (await cards.findOne({ _id: toId(cardId) }))!;

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
          blocked: existingCard.blocked ?? null,
          archived: existingCard.archived ?? false,
        },
        newValues: {
          title: updatedCard.title,
          description: updatedCard.description,
          columnId: updatedCard.columnId,
          position: updatedCard.position,
          tags: updatedCard.tags,
          blocked: updatedCard.blocked ?? null,
          archived: updatedCard.archived ?? false,
        },
      });

      // Log activity
      const fromCol = await columns.findOne({ _id: toId(existingCard.columnId) });
      const toCol = await columns.findOne({ _id: toId(columnId) });
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
    if (blocked !== undefined) updateData.blocked = blocked || null;
    if (archived !== undefined) updateData.archived = archived;

    await cards.updateOne(
      { _id: toId(cardId) },
      { $set: { ...updateData, updatedAt: new Date() } },
    );
    const updatedCard = (await cards.findOne({ _id: toId(cardId) }))!;

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
          blocked: existingCard.blocked ?? null,
          archived: existingCard.archived ?? false,
        },
        newValues: {
          title: updatedCard.title,
          description: updatedCard.description,
          tags: updatedCard.tags,
          blocked: updatedCard.blocked ?? null,
          archived: updatedCard.archived ?? false,
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
    if (archived !== undefined && existingCard.archived !== archived) fieldsChanged.push('archived');
    if (blocked !== undefined && (existingCard.blocked ?? null) !== (blocked || null)) fieldsChanged.push('blocked');
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
    if (isUnauthorizedError(error)) {
      return unauthorizedResponse(error.message);
    }
    if (error instanceof Error && error.message.startsWith('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to update card' }, { status: 500 });
  }
}
