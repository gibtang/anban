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

    // Get board and verify ownership
    const board = await prisma.board.findFirst({
      where: {
        id,
        ownerId: userId,
      },
    });

    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    // Manually fetch columns and cards
    const columns = await prisma.column.findMany({
      where: { boardId: board.id },
      orderBy: { position: 'asc' },
    });

    const columnsWithCards = await Promise.all(
      columns.map(async (column: { id: string; name: string; position: number; boardId: string; createdAt: Date }) => {
        const cards = await prisma.card.findMany({
          where: { columnId: column.id },
          orderBy: { position: 'asc' },
        });
        return {
          ...column,
          cards,
        };
      })
    );

    return NextResponse.json({
      ...board,
      columns: columnsWithCards,
    });
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
    const { name, columnOrder } = body;

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
    const updateData: { name?: string; updatedAt?: boolean } = {};
    if (name && typeof name === 'string' && name.trim().length > 0) {
      updateData.name = name.trim();
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
      // Delete Telegram config
      prisma.telegramConfig.deleteMany({
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
