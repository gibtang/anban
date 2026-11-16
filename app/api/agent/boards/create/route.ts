import { NextRequest, NextResponse } from 'next/server';
import { verifyAgentAuth, isUnauthorizedError, unauthorizedResponse } from '@/lib/auth/helpers';
import { boards, columns, toId } from '@/lib/db/mongo';

export const runtime = 'nodejs';

/**
 * Agent endpoint: create a new board
 * POST /api/agent/boards/create
 * Headers: Authorization: Bearer <agentToken>
 * Body: { name: string, description?: string }
 *
 * Creates the board owned by the same user who owns the agent's account.
 * description is optional.
 */
export async function POST(request: NextRequest) {
  try {
    const { agentId, ownerId } = await verifyAgentAuth(request);

    if (!ownerId) {
      return NextResponse.json({ error: 'Agent not linked to an account' }, { status: 400 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (name.trim().length > 100) {
      return NextResponse.json({ error: 'Name must be 100 characters or fewer' }, { status: 400 });
    }

    // Check if board with same name already exists for this account
    const duplicate = await boards.findOne({
      name: name.trim(),
      ownerId: toId(ownerId),
    });

    if (duplicate) {
      return NextResponse.json(
        { error: 'Board with this name already exists', boardId: duplicate.id },
        { status: 409 },
      );
    }

    // Create board + default columns
    const now = new Date();
    const boardId = await boards.insertOne({
      name: name.trim(),
      description: description?.trim() || null,
      ownerId: toId(ownerId),
      favorited: false,
      archived: false,
      createdAt: now,
      updatedAt: now,
    });

    const columnIds = await Promise.all([
      columns.insertOne({ name: 'To Do', position: 0, boardId: toId(boardId), createdAt: now }),
      columns.insertOne({ name: 'In Progress', position: 1, boardId: toId(boardId), createdAt: now }),
      columns.insertOne({ name: 'Done', position: 2, boardId: toId(boardId), createdAt: now }),
    ]);

    const createdColumns = await Promise.all(
      columnIds.map((cid) => columns.findOne({ _id: toId(cid) }))
    );

    const board = await boards.findOne({ _id: toId(boardId) });

    return NextResponse.json(
      { ...board, columns: createdColumns },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error creating agent board:', error);
    if (isUnauthorizedError(error)) {
      return unauthorizedResponse(error.message);
    }
    return NextResponse.json({ error: 'Failed to create board' }, { status: 500 });
  }
}
