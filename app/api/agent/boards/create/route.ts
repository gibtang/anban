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
 * Creates the board owned by the same user who owns the boards the agent
 * already has access to, then auto-approves the agent on the new board.
 */
export async function POST(request: NextRequest) {
  try {
    const { agentId } = await verifyAgentAuth(request);

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Derive ownerId from any existing board the agent has access to
    const existingAccess = await prisma.boardAccess.findFirst({
      where: { agentId, status: 'approved' },
      select: { boardId: true },
    });

    if (!existingAccess) {
      return NextResponse.json(
        { error: 'Agent has no approved board access — cannot determine owner' },
        { status: 403 },
      );
    }

    const existingBoard = await prisma.board.findUnique({
      where: { id: existingAccess.boardId },
      select: { ownerId: true },
    });

    if (!existingBoard) {
      return NextResponse.json(
        { error: 'Referenced board not found' },
        { status: 500 },
      );
    }

    // Check if board with same name already exists for this owner
    const duplicate = await prisma.board.findFirst({
      where: { name: name.trim(), ownerId: existingBoard.ownerId },
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
        ownerId: existingBoard.ownerId,
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

    // Auto-approve agent access to the new board
    await prisma.boardAccess.create({
      data: {
        boardId: board.id,
        agentId,
        status: 'approved',
        approvedAt: new Date(),
      },
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
