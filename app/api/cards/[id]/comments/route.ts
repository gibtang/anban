import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAuth } from '@/lib/auth/helpers';
import { logActivity } from '@/lib/db/activity';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/cards/:cardId/comments
 * List comments on a card (user-facing)
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const userId = await verifyAuth(request);
    const { id: cardId } = await context.params;

    // Verify card belongs to a board owned by this user
    const card = await prisma.card.findFirst({
      where: { id: cardId },
    });

    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    const board = await prisma.board.findFirst({
      where: { id: card.boardId, ownerId: userId },
    });

    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    const comments = await prisma.comment.findMany({
      where: { cardId },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

/**
 * POST /api/cards/:cardId/comments
 * Add a comment to a card (user-facing)
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const userId = await verifyAuth(request);
    const { id: cardId } = await context.params;

    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'Comment content is required' }, { status: 400 });
    }

    if (content.length > 2000) {
      return NextResponse.json(
        { error: 'Comment must be 2000 characters or less' },
        { status: 400 }
      );
    }

    // Verify card belongs to a board owned by this user
    const card = await prisma.card.findFirst({
      where: { id: cardId },
    });

    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    const board = await prisma.board.findFirst({
      where: { id: card.boardId, ownerId: userId },
    });

    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    const comment = await prisma.comment.create({
      data: {
        cardId,
        boardId: card.boardId,
        authorId: userId,
        authorName: 'You',
        authorType: 'user',
        content: content.trim(),
      },
    });

    // Log activity
    await logActivity({
      cardId,
      boardId: card.boardId,
      type: 'commented',
      authorId: userId,
      authorName: 'You',
      authorType: 'user',
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('Error creating comment:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}
