import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAuth } from '@/lib/auth/helpers';
import { logAuditEvent } from '@/lib/db/audit';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const userId = await verifyAuth(request);

    const { id } = await context.params;
    const body = await request.json();
    const { title, description, columnId, position, assigneeId, tags, agentId } = body;

    // Verify card exists and user has access
    const existingCard = await prisma.card.findFirst({
      where: {
        id,
      },
    });

    if (!existingCard) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    // Verify board ownership
    const board = await prisma.board.findFirst({
      where: {
        id: existingCard.boardId,
        ownerId: userId,
      },
    });

    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    // Prepare audit data
    const oldValues = {
      title: existingCard.title,
      description: existingCard.description,
      columnId: existingCard.columnId,
      position: existingCard.position,
      assigneeId: existingCard.assigneeId,
      tags: existingCard.tags,
      agentId: existingCard.agentId,
    };

    // Build update data
    const updateData: {
      title?: string;
      description?: string | null;
      columnId?: string;
      position?: number;
      assigneeId?: string | null;
      tags?: string[];
      agentId?: string | null;
    } = {};

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length === 0) {
        return NextResponse.json({ error: 'Title is required' }, { status: 400 });
      }
      updateData.title = title.trim();
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }

    if (columnId !== undefined) {
      updateData.columnId = columnId;
    }

    if (position !== undefined) {
      updateData.position = position;
    }

    if (assigneeId !== undefined) {
      updateData.assigneeId = assigneeId || null;
    }

    if (tags !== undefined) {
      updateData.tags = tags;
    }

    if (agentId !== undefined) {
      updateData.agentId = agentId || null;
    }

    // Update card
    const card = await prisma.card.update({
      where: { id },
      data: updateData,
    });

    // Manually fetch assignee if present
    let assignee = null;
    if (card.assigneeId) {
      assignee = await prisma.user.findUnique({
        where: { id: card.assigneeId },
        select: { id: true, firebaseUid: true },
      });
    }

    const cardWithAssignee = {
      ...card,
      assignee,
    };

    // Log card update
    await logAuditEvent({
      userId,
      action: 'UPDATE',
      entityType: 'Card',
      entityId: card.id,
      oldValues,
      newValues: {
        title: card.title,
        description: card.description,
        columnId: card.columnId,
        position: card.position,
        assigneeId: card.assigneeId,
        tags: card.tags,
        agentId: card.agentId,
      },
    });

    return NextResponse.json(cardWithAssignee);
  } catch (error) {
    console.error('Error updating card:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to update card' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const userId = await verifyAuth(request);

    const { id } = await context.params;

    // Verify card exists and user has access
    const existingCard = await prisma.card.findFirst({
      where: {
        id,
      },
    });

    if (!existingCard) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    // Verify board ownership
    const board = await prisma.board.findFirst({
      where: {
        id: existingCard.boardId,
        ownerId: userId,
      },
    });

    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    // Prepare audit data for deletion
    const oldValues = {
      title: existingCard.title,
      description: existingCard.description,
      columnId: existingCard.columnId,
      position: existingCard.position,
      assigneeId: existingCard.assigneeId,
      tags: existingCard.tags,
      agentId: existingCard.agentId,
    };

    // Delete card
    await prisma.card.delete({
      where: { id },
    });

    // Log card deletion
    await logAuditEvent({
      userId,
      action: 'DELETE',
      entityType: 'Card',
      entityId: id,
      oldValues,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting card:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to delete card' }, { status: 500 });
  }
}
