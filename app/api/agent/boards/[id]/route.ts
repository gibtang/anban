import { NextRequest, NextResponse } from 'next/server';
import { verifyAgentAuth, isUnauthorizedError, unauthorizedResponse } from '@/lib/auth/helpers';
import { boards, toId } from '@/lib/db/mongo';

export const runtime = 'nodejs';

/**
 * Agent endpoint: archive or unarchive a board
 * PUT /api/agent/boards/[id]
 * Headers: Authorization: Bearer <agentToken>
 * Body: { archived: boolean }
 *
 * Archived boards are hidden from the default board list but not deleted.
 * Cards and columns are preserved — the board can be unarchived at any time.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { ownerId } = await verifyAgentAuth(request);
    const { id } = await params;

    if (!ownerId) {
      return NextResponse.json({ error: 'Agent not linked to an account' }, { status: 400 });
    }

    const body = await request.json();
    const { archived } = body;

    if (typeof archived !== 'boolean') {
      return NextResponse.json({ error: 'archived must be a boolean' }, { status: 400 });
    }

    // Verify the board belongs to the agent's account
    const board = await boards.findOne({
      _id: toId(id),
      ownerId: toId(ownerId),
    });

    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    await boards.updateOne(
      { _id: toId(id) },
      { $set: { archived, updatedAt: new Date() } },
    );

    return NextResponse.json({
      id: board.id,
      name: board.name,
      archived,
    });
  } catch (error) {
    console.error('Error archiving board:', error);
    if (isUnauthorizedError(error)) {
      return unauthorizedResponse(error.message);
    }
    return NextResponse.json({ error: 'Failed to update board' }, { status: 500 });
  }
}
