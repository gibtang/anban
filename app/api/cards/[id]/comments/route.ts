import { NextRequest, NextResponse } from 'next/server';
import { boards, cards, comments, toId, toIdOrNull } from '@/lib/db/mongo';
import { verifyAuth, isUnauthorizedError, unauthorizedResponse } from '@/lib/auth/helpers';
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
    const cardOid = toIdOrNull(cardId);
    const card = cardOid ? await cards.findOne({ _id: cardOid }) : null;

    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    const board = await boards.findOne({
      _id: toId(card.boardId),
      ownerId: toId(userId),
    });

    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    const commentDocs = await comments.find({ cardId: cardOid }, { sort: { createdAt: 1 } });

    return NextResponse.json(commentDocs);
  } catch (error) {
    console.error('Error fetching comments:', error);
    if (isUnauthorizedError(error)) {
      return unauthorizedResponse(error.message);
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
    const cardOid = toIdOrNull(cardId);
    const card = cardOid ? await cards.findOne({ _id: cardOid }) : null;

    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    const board = await boards.findOne({
      _id: toId(card.boardId),
      ownerId: toId(userId),
    });

    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    const commentId = await comments.insertOne({
      cardId: cardOid,
      boardId: toId(card.boardId),
      authorId: toId(userId),
      authorName: 'You',
      authorType: 'user',
      content: content.trim(),
      createdAt: new Date(),
    });
    const comment = await comments.findOne({ _id: toId(commentId) });

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
    if (isUnauthorizedError(error)) {
      return unauthorizedResponse(error.message);
    }
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}
