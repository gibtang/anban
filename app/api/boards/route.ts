import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAuth } from '@/lib/auth/helpers';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const userId = await verifyAuth(request);

    const showArchived = request.nextUrl.searchParams.get('includeArchived') === 'true';

    // Get all boards for the user with column/card counts in a single query
    const boards = await prisma.board.findMany({
      where: {
        ownerId: userId,
        ...(showArchived ? {} : { archived: false }),
      },
      orderBy: [
        { favorited: 'desc' },
        { updatedAt: 'desc' },
      ],
      include: {
        _count: {
          select: { columns: true, cards: { where: { archived: false } } },
        },
        columns: {
          select: { id: true, name: true },
        },
      },
    });

    // Get "Done" column IDs per board
    const doneColumnIds = boards.flatMap((b: { columns: { id: string; name: string }[] }) =>
      b.columns.filter((c: { name: string }) => c.name === 'Done').map((c: { id: string }) => c.id),
    );

    // Count open (non-Done, non-archived) cards in a single query
    const openCounts = await prisma.card.groupBy({
      by: ['boardId'],
      where: {
        boardId: { in: boards.map((b: { id: string }) => b.id) },
        columnId: { notIn: doneColumnIds },
        archived: false,
      },
      _count: true,
    });

    const openMap = new Map(openCounts.map((r: { boardId: string; _count: number }) => [r.boardId, r._count]));

    // Strip columns from response, add openCardCount
    const result = boards.map((b: { columns?: unknown; [key: string]: unknown }) => {
      const { columns, ...rest } = b;
      return { ...rest, openCardCount: openMap.get(b.id as string) ?? 0 };
    });

    return NextResponse.json(result);
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
    const { name, description } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Create board + default columns in a single DB call
    const board = await prisma.board.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        ownerId: userId,
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
    console.error('Error creating board:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to create board' }, { status: 500 });
  }
}
