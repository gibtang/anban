import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAgentAuth, verifyAgentBoardAccess } from '@/lib/auth/helpers';

export const runtime = 'nodejs';

/**
 * Agent endpoint: create a card on a board
 * POST /api/agent/cards
 * Body: { boardId, title, description?, columnId?, tags? }
 */
export async function POST(request: NextRequest) {
  try {
    const { agentId } = await verifyAgentAuth(request);

    const body = await request.json();
    const { boardId, title, description, columnId, tags } = body;

    if (!boardId) {
      return NextResponse.json({ error: 'boardId is required' }, { status: 400 });
    }

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    await verifyAgentBoardAccess(agentId, boardId);

    // If no column specified, find or create "To Do" column
    let targetColumnId = columnId;
    if (!targetColumnId) {
      const todoColumn = await prisma.column.findFirst({
        where: { boardId, name: 'To Do' },
      });
      if (todoColumn) {
        targetColumnId = todoColumn.id;
      } else {
        const newColumn = await prisma.column.create({
          data: { name: 'To Do', position: 0, boardId },
        });
        targetColumnId = newColumn.id;
      }
    }

    // Verify column belongs to this board
    const column = await prisma.column.findFirst({
      where: { id: targetColumnId, boardId },
    });
    if (!column) {
      return NextResponse.json({ error: 'Column not found on this board' }, { status: 400 });
    }

    // Get next position
    const maxPosCard = await prisma.card.findFirst({
      where: { columnId: targetColumnId },
      orderBy: { position: 'desc' },
    });
    const position = maxPosCard ? maxPosCard.position + 1 : 0;

    const card = await prisma.card.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        columnId: targetColumnId,
        boardId,
        tags: tags || [],
        position,
      },
    });

    return NextResponse.json(card, { status: 201 });
  } catch (error) {
    console.error('Error in agent card creation:', error);
    if (error instanceof Error && error.message.startsWith('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof Error && error.message.startsWith('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to create card' }, { status: 500 });
  }
}
