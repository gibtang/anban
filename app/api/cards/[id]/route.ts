import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAuth } from '@/lib/auth/helpers';
import { logAuditEvent } from '@/lib/db/audit';
import { logActivity } from '@/lib/db/activity';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const userId = await verifyAuth(request);

    const { id } = await context.params;
    const body = await request.json();
    const { title, description, columnId, position, tags, agentId, archived } = body;

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
      tags: existingCard.tags,
      agentId: existingCard.agentId,
      archived: (existingCard as any).archived ?? false,
    };

    // Build update data
    const updateData: {
      title?: string;
      description?: string | null;
      columnId?: string;
      position?: number;
      tags?: string[];
      agentId?: string | null;
      archived?: boolean;
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

    if (tags !== undefined) {
      updateData.tags = tags;
    }

    if (agentId !== undefined) {
      updateData.agentId = agentId || null;
    }

    if (archived !== undefined) {
      if (typeof archived !== 'boolean') {
        return NextResponse.json({ error: 'archived must be a boolean' }, { status: 400 });
      }
      updateData.archived = archived;
    }

    // Update card
    const card = await prisma.card.update({
      where: { id },
      data: updateData,
    });

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
        tags: card.tags,
        agentId: card.agentId,
        archived: (card as any).archived ?? false,
      },
    });

    // Log activity — determine type from what changed
    const activityPromises: Promise<void>[] = [];

    if (updateData.columnId && existingCard.columnId !== updateData.columnId) {
      // Card moved between columns
      const fromCol = await prisma.column.findUnique({ where: { id: existingCard.columnId } });
      const toCol = await prisma.column.findUnique({ where: { id: updateData.columnId } });
      activityPromises.push(
        logActivity({
          cardId: card.id,
          boardId: card.boardId,
          type: 'moved',
          authorId: userId,
          authorName: 'You',
          authorType: 'user',
          details: {
            fromColumn: fromCol?.name ?? existingCard.columnId,
            toColumn: toCol?.name ?? updateData.columnId,
          },
        })
      );
    }

    if (updateData.agentId !== undefined && existingCard.agentId !== updateData.agentId) {
      activityPromises.push(
        logActivity({
          cardId: card.id,
          boardId: card.boardId,
          type: updateData.agentId ? 'assigned' : 'unassigned',
          authorId: userId,
          authorName: 'You',
          authorType: 'user',
        })
      );
    }

    // Check if title/description/tags changed (not just move or assign)
    const fieldsChanged: string[] = [];
    if (updateData.title && existingCard.title !== updateData.title) fieldsChanged.push('title');
    if (updateData.description !== undefined && existingCard.description !== updateData.description) fieldsChanged.push('description');
    if (updateData.tags && JSON.stringify(existingCard.tags) !== JSON.stringify(updateData.tags)) fieldsChanged.push('tags');
    if (fieldsChanged.length > 0) {
      activityPromises.push(
        logActivity({
          cardId: card.id,
          boardId: card.boardId,
          type: 'updated',
          authorId: userId,
          authorName: 'You',
          authorType: 'user',
          details: { fields: fieldsChanged },
        })
      );
    }

    await Promise.all(activityPromises);

    return NextResponse.json(card);
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
