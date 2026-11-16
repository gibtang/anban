import { NextRequest, NextResponse } from 'next/server';
import { boards, cards, columns, toId, type BoardDoc, type CardDoc, type ColumnDoc } from '@/lib/db/mongo';
import { verifyAuth, isUnauthorizedError, unauthorizedResponse } from '@/lib/auth/helpers';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const userId = await verifyAuth(request);

    const showArchived = request.nextUrl.searchParams.get('includeArchived') === 'true';

    // Get all boards for the user
    const boardDocs = await boards.find(
      {
        ownerId: toId(userId),
        ...(showArchived ? {} : { archived: false }),
      },
      { sort: { favorited: -1, updatedAt: -1 } }
    );

    if (boardDocs.length === 0) {
      return NextResponse.json([]);
    }
    const boardIds = boardDocs.map((b: BoardDoc) => toId(b.id));

    // Load columns and non-archived cards to compute counts in JS
    const columnDocs = await columns.find({ boardId: { $in: boardIds } });
    const cardDocs = await cards.find({ boardId: { $in: boardIds }, archived: false });

    const columnsByBoard = new Map<string, ColumnDoc[]>();
    for (const c of columnDocs) {
      const list = columnsByBoard.get(c.boardId) ?? [];
      list.push(c);
      columnsByBoard.set(c.boardId, list);
    }
    const cardCountByBoard = new Map<string, number>();
    for (const c of cardDocs) {
      cardCountByBoard.set(c.boardId, (cardCountByBoard.get(c.boardId) ?? 0) + 1);
    }

    // Get "Done" column IDs per board
    const doneColumnIds = boardDocs.flatMap((b: BoardDoc) =>
      (columnsByBoard.get(b.id) ?? []).filter((c) => c.name === 'Done').map((c) => c.id),
    );
    const doneSet = new Set(doneColumnIds);

    // Count open (non-Done, non-archived) cards per board
    const openCountByBoard = new Map<string, number>();
    for (const c of cardDocs as CardDoc[]) {
      if (doneSet.has(c.columnId)) continue;
      openCountByBoard.set(c.boardId, (openCountByBoard.get(c.boardId) ?? 0) + 1);
    }

    // Strip columns from response, add counts
    const result = boardDocs.map((b: BoardDoc) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      ownerId: b.ownerId,
      favorited: b.favorited,
      archived: b.archived,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
      _count: {
        columns: (columnsByBoard.get(b.id) ?? []).length,
        cards: cardCountByBoard.get(b.id) ?? 0,
      },
      openCardCount: openCountByBoard.get(b.id) ?? 0,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching boards:', error);
    if (isUnauthorizedError(error)) {
      return unauthorizedResponse(error.message);
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

    const now = new Date();

    // Create board
    const boardId = await boards.insertOne({
      name: name.trim(),
      description: description?.trim() || null,
      ownerId: toId(userId),
      favorited: false,
      archived: false,
      createdAt: now,
      updatedAt: now,
    });

    // Create default columns
    const columnIds: string[] = [];
    const defaults = [
      { name: 'To Do', position: 0 },
      { name: 'In Progress', position: 1 },
      { name: 'Done', position: 2 },
    ];
    for (const col of defaults) {
      columnIds.push(
        await columns.insertOne({
          name: col.name,
          position: col.position,
          boardId: toId(boardId),
          createdAt: now,
        })
      );
    }

    const board = await boards.findOne({ _id: toId(boardId) });
    const columnDocs = columnIds.length ? await columns.find({ _id: { $in: columnIds.map(toId) } }, { sort: { position: 1 } }) : [];

    return NextResponse.json({ ...board, columns: columnDocs }, { status: 201 });
  } catch (error) {
    console.error('Error creating board:', error);
    if (isUnauthorizedError(error)) {
      return unauthorizedResponse(error.message);
    }
    return NextResponse.json({ error: 'Failed to create board' }, { status: 500 });
  }
}
