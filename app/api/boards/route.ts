import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyIdToken } from '@/lib/firebase/admin';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('firebase-auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decodedToken = await verifyIdToken(token);
    const firebaseUid = decodedToken.uid;

    // Get user by Firebase UID
    const user = await prisma.user.findUnique({
      where: { firebaseUid },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get all boards for the user
    const boards = await prisma.board.findMany({
      where: { ownerId: user.id },
      orderBy: { updatedAt: 'desc' },
    });

    // Manually count columns and cards for each board
    const boardsWithCounts = await Promise.all(
      boards.map(async (board: { id: string; name: string; ownerId: string; createdAt: Date; updatedAt: Date }) => {
        const [columnCount, cardCount] = await Promise.all([
          prisma.column.count({ where: { boardId: board.id } }),
          prisma.card.count({ where: { boardId: board.id } }),
        ]);

        return {
          ...board,
          _count: {
            cards: cardCount,
            columns: columnCount,
          },
        };
      })
    );

    return NextResponse.json(boardsWithCounts);
  } catch (error) {
    console.error('Error fetching boards:', error);
    return NextResponse.json({ error: 'Failed to fetch boards' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('firebase-auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decodedToken = await verifyIdToken(token);
    const firebaseUid = decodedToken.uid;

    // Get user by Firebase UID
    const user = await prisma.user.findUnique({
      where: { firebaseUid },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Create board
    const board = await prisma.board.create({
      data: {
        name: name.trim(),
        ownerId: user.id,
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
    return NextResponse.json({ error: 'Failed to create board' }, { status: 500 });
  }
}
