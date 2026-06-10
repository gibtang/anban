import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAgentAuth } from '@/lib/auth/helpers';

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
    const board = await prisma.board.findFirst({
      where: { id, ownerId },
    });

    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    const updated = await prisma.board.update({
      where: { id },
      data: { archived },
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      archived: updated.archived,
    });
  } catch (error) {
    console.error('Error archiving board:', error);
    if (error instanceof Error && error.message.startsWith('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to update board' }, { status: 500 });
  }
}
