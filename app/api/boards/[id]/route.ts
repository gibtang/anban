import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAuth } from '@/lib/auth/helpers';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const userId = await verifyAuth(request);

    const { id } = await context.params;

    // Fetch board with columns and cards in a single query using includes
    const board = await prisma.board.findFirst({
      where: {
        id,
        ownerId: userId,
      },
      include: {
        columns: {
          orderBy: { position: 'asc' },
          include: {
            cards: {
              where: { archived: false },
              orderBy: { position: 'asc' },
            },
          },
        },
      },
    });

    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    // Fix orphaned cards: cards with boardId matching but columnId not in any column
    const columnIds = board.columns.map((c) => c.id);
    if (columnIds.length > 0) {
      const orphanedCards = await prisma.card.findMany({
        where: {
          boardId: id,
          columnId: { notIn: columnIds },
        },
      });

      if (orphanedCards.length > 0) {
        // Reassign to first column (usually "To Do")
        const defaultColumnId = columnIds[0];
        await prisma.card.updateMany({
          where: {
            id: { in: orphanedCards.map((c) => c.id) },
          },
          data: { columnId: defaultColumnId },
        });

        // Re-fetch to include repaired cards
        const repaired = await prisma.board.findFirst({
          where: { id, ownerId: userId },
          include: {
            columns: {
              orderBy: { position: 'asc' },
              include: { cards: { orderBy: { position: 'asc' } } },
            },
          },
        });
        return NextResponse.json(repaired);
      }
    }

    return NextResponse.json(board);
  } catch (error) {
    console.error('Error fetching board:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch board' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const userId = await verifyAuth(request);

    const { id } = await context.params;
    const body = await request.json();
    const { name, columnOrder, favorited, archived } = body;

    // Verify board ownership
    const existingBoard = await prisma.board.findFirst({
      where: {
        id,
        ownerId: userId,
      },
    });

    if (!existingBoard) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    // Update board
    const updateData: { name?: string; favorited?: boolean; archived?: boolean } = {};
    if (name && typeof name === 'string' && name.trim().length > 0) {
      updateData.name = name.trim();
    }
    if (favorited !== undefined && typeof favorited === 'boolean') {
      updateData.favorited = favorited;
    }
    if (archived !== undefined && typeof archived === 'boolean') {
      updateData.archived = archived;
    }

    const board = await prisma.board.update({
      where: { id },
      data: updateData,
    });

    // Update column positions if provided
    if (columnOrder && Array.isArray(columnOrder)) {
      await Promise.all(
        columnOrder.map((columnId: string, index: number) =>
          prisma.column.update({
            where: { id: columnId },
            data: { position: index },
          })
        )
      );
    }

    return NextResponse.json(board);
  } catch (error) {
    console.error('Error updating board:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to update board' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const userId = await verifyAuth(request);

    const { id } = await context.params;

    // Verify board ownership before deletion
    const existingBoard = await prisma.board.findFirst({
      where: {
        id,
        ownerId: userId,
      },
    });

    if (!existingBoard) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    // Manually delete related records (MongoDB doesn't cascade)
    const columns = await prisma.column.findMany({
      where: { boardId: id },
      select: { id: true },
    });

    await Promise.all([
      // Delete cards
      prisma.card.deleteMany({
        where: { boardId: id },
      }),
      // Delete columns
      prisma.column.deleteMany({
        where: { boardId: id },
      }),
      // Delete OpenClaw connection
      prisma.openClawConnection.deleteMany({
        where: { boardId: id },
      }),
    ]);

    // Delete board
    await prisma.board.delete({
      where: { id },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting board:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to delete board' }, { status: 500 });
  }
}
