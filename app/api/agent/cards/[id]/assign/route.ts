import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAgentAuth } from '@/lib/auth/helpers';
import { eventBus } from '@/lib/events/event-bus';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const runtime = 'nodejs';

/**
 * Agent endpoint: reassign a card to another agent on the board
 * PUT /api/agent/cards/:cardId/assign
 * Body: { boardId, agentId: string | null }
 * Headers: Authorization: Bearer <agentToken>
 *
 * Pass agentId to assign to a specific agent, or null to unassign.
 * The target agentId must be an Agent ID with approved BoardAccess on the same board.
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { agentId: callingAgentId, agentName } = await verifyAgentAuth(request);
    const { id: cardId } = await context.params;

    const body = await request.json();
    const { boardId, agentId } = body;

    if (!boardId) {
      return NextResponse.json({ error: 'boardId is required' }, { status: 400 });
    }


    // Verify card belongs to this board
    const card = await prisma.card.findFirst({
      where: { id: cardId, boardId },
    });

    if (!card) {
      return NextResponse.json({ error: 'Card not found on this board' }, { status: 404 });
    }

    // If assigning to an agent, verify they have approved access on this board
    if (agentId) {
      const targetAccess = await prisma.boardAccess.findFirst({
        where: {
          agentId,
          boardId,
          status: 'approved',
        },
      });

      if (!targetAccess) {
        return NextResponse.json(
          { error: 'Target agent not found or not approved on this board' },
          { status: 400 }
        );
      }
    }

    const updatedCard = await prisma.card.update({
      where: { id: cardId },
      data: {
        agentId: agentId || null,
      },
    });

    // Emit real-time event
    eventBus.emitEvent({
      type: 'card.updated',
      boardId,
      cardId,
    });

    // Resolve agent name for response
    const assignedAgent = agentId
      ? await prisma.agent.findUnique({ where: { id: agentId }, select: { name: true } })
      : null;

    return NextResponse.json({
      ...updatedCard,
      _meta: {
        assignedTo: assignedAgent?.name || null,
        reassignedBy: agentName,
      },
    });
  } catch (error) {
    console.error('Error reassigning card:', error);
    if (error instanceof Error && error.message.startsWith('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof Error && error.message.startsWith('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to reassign card' }, { status: 500 });
  }
}
