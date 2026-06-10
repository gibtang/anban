import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAgentAuth } from '@/lib/auth/helpers';

export const runtime = 'nodejs';

/**
 * Agent endpoint: create a new board
 * POST /api/agent/boards/create
 * Headers: Authorization: Bearer <agentToken>
 * Body: { name: string }
 *
 * Creates the board owned by the same user who owns the agent's account.
 */
export async function POST(request: NextRequest) {
  try {
    const { agentId, ownerId } = await verifyAgentAuth(request);

    if (!ownerId) {
      return NextResponse.json({ error: 'Agent not linked to an account' }, { status: 400 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (name.trim().length > 100) {
      return NextResponse.json({ error: 'Name must be 100 characters or fewer' }, { status: 400 });
    }

    // Check if board with same name already exists for this account
    const duplicate = await prisma.board.findFirst({
      where: { name: name.trim(), ownerId },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: 'Board with this name already exists', boardId: duplicate.id },
        { status: 409 },
      );
    }

    // Create board + default columns
    const board = await prisma.board.create({
      data: {
        name: name.trim(),
        ownerId,
        columns: {
          create: [
            { name: 'To Do', position: 0 },
            { name: 'In Progress', position: 1 },
            { name: 'Done', position: 2 },
          ],
        },
      },
      include: { columns: true },
    });

    return NextResponse.json(board, { status: 201 });
  } catch (error) {
    console.error('Error creating agent board:', error);
    if (error instanceof Error && error.message.startsWith('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to create board' }, { status: 500 });
  }
}
