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
 * Agent endpoint: delete a card
 * DELETE /api/agent/cards/:cardId/delete
 * Body: { boardId }
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { agentId, agentName } = await verifyAgentAuth(request);
    const { id: cardId } = await context.params;

    const body = await request.json();
    const { boardId } = body;

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

    // Audit trail before deletion
    await logAuditEvent({
      agentId,
      action: 'DELETE',
      entityType: 'Card',
      entityId: cardId,
      oldValues: {
        title: existingCard.title,
        description: existingCard.description,
        columnId: existingCard.columnId,
        boardId: existingCard.boardId,
        position: existingCard.position,
        tags: existingCard.tags,
      },
    });

    // Delete the card
    await prisma.card.delete({
      where: { id: cardId },
    });

    // Emit real-time event
    eventBus.emitEvent({
      type: 'card.deleted',
      boardId,
      cardId,
    });

    // Log activity
    await logActivity({
      cardId,
      boardId,
      type: 'deleted',
      authorId: agentId,
      authorName: agentName,
      authorType: 'agent',
      details: {
        title: existingCard.title,
        columnId: existingCard.columnId,
      },
    });

    return NextResponse.json({ success: true, deletedCardId: cardId });
  } catch (error) {
    console.error('Error in agent card delete:', error);
    if (error instanceof Error && error.message.startsWith('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof Error && error.message.startsWith('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to delete card' }, { status: 500 });
  }
}
