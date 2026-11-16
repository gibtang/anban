import { NextRequest, NextResponse } from 'next/server';
import { verifyAgentAuth, isUnauthorizedError, unauthorizedResponse } from '@/lib/auth/helpers';
import { eventBus } from '@/lib/events/event-bus';
import { agents, cards, toId } from '@/lib/db/mongo';

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
 * The target agentId must be an Agent on the same account.
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
    const card = await cards.findOne({
      _id: toId(cardId),
      boardId: toId(boardId),
    });

    if (!card) {
      return NextResponse.json({ error: 'Card not found on this board' }, { status: 404 });
    }

    // If assigning to an agent, verify they exist on the same account
    if (agentId) {
      const targetAgent = await agents.findOne({ _id: toId(agentId) });

      if (!targetAgent) {
        return NextResponse.json(
          { error: 'Target agent not found' },
          { status: 400 }
        );
      }
    }

    const updatedAt = new Date();
    await cards.updateOne(
      { _id: toId(cardId) },
      { $set: { agentId: agentId ? toId(agentId) : null, updatedAt } },
    );

    // Emit real-time event
    eventBus.emitEvent({
      type: 'card.updated',
      boardId,
      cardId,
    });

    // Resolve agent name for response
    const assignedAgent = agentId
      ? await agents.findOne({ _id: toId(agentId) })
      : null;

    const updatedCard = { ...card, agentId: agentId || null, updatedAt };

    return NextResponse.json({
      ...updatedCard,
      _meta: {
        assignedTo: assignedAgent?.name || null,
        reassignedBy: agentName,
      },
    });
  } catch (error) {
    console.error('Error reassigning card:', error);
    if (isUnauthorizedError(error)) {
      return unauthorizedResponse(error.message);
    }
    if (error instanceof Error && error.message.startsWith('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to reassign card' }, { status: 500 });
  }
}
