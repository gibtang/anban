import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAuth } from '@/lib/auth/helpers';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const userId = await verifyAuth(request);

    // Get all boards for the user with column/card counts in a single query
    const boards = await prisma.board.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { columns: true, cards: true },
        },
      },
    });

    return NextResponse.json(boards);
  } catch (error) {
    console.error('Error fetching boards:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch boards' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await verifyAuth(request);

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Create board
    const board = await prisma.board.create({
      data: {
        name: name.trim(),
        ownerId: userId,
      },
    });

    // Create default columns manually
    const columns = await Promise.all([
      prisma.column.create({
        data: { name: 'To Do', position: 0, boardId: board.id },
      }),
      prisma.column.create({
        data: { name: 'In Progress', position: 1, boardId: board.id },
      }),
      prisma.column.create({
        data: { name: 'Done', position: 2, boardId: board.id },
      }),
    ]);

    return NextResponse.json({ ...board, columns }, { status: 201 });
  } catch (error) {
    console.error('Error creating board:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to create board' }, { status: 500 });
  }
}
