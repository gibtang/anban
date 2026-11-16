import { NextRequest, NextResponse } from 'next/server';
import { verifyAgentAuth, isUnauthorizedError, unauthorizedResponse } from '@/lib/auth/helpers';
import { cards, comments, toId } from '@/lib/db/mongo';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const runtime = 'nodejs';

/**
 * Agent endpoint: add a comment to a card
 * POST /api/agent/cards/:cardId/comments
 * Body: { boardId, content: string }
 * Headers: Authorization: Bearer <agentToken>
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { agentId, agentName } = await verifyAgentAuth(request);
    const { id: cardId } = await context.params;

    const body = await request.json();
    const { boardId, content } = body;

    if (!boardId) {
      return NextResponse.json({ error: 'boardId is required' }, { status: 400 });
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'Comment content is required' }, { status: 400 });
    }

    if (content.length > 2000) {
      return NextResponse.json(
        { error: 'Comment must be 2000 characters or less' },
        { status: 400 }
      );
    }

    // Verify card belongs to this board
    const card = await cards.findOne({
      _id: toId(cardId),
      boardId: toId(boardId),
    });

    if (!card) {
      return NextResponse.json({ error: 'Card not found on this board' }, { status: 404 });
    }

    const commentId = await comments.insertOne({
      cardId: toId(cardId),
      boardId: toId(boardId),
      authorId: toId(agentId),
      authorName: agentName,
      authorType: 'agent',
      content: content.trim(),
      createdAt: new Date(),
    });
    const comment = await comments.findOne({ _id: toId(commentId) });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('Error creating agent comment:', error);
    if (isUnauthorizedError(error)) {
      return unauthorizedResponse(error.message);
    }
    if (error instanceof Error && error.message.startsWith('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}

/**
 * Agent endpoint: list comments on a card
 * GET /api/agent/cards/:cardId/comments?boardId=xxx
 * Headers: Authorization: Bearer <agentToken>
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { agentId } = await verifyAgentAuth(request);
    const { id: cardId } = await context.params;

    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get('boardId');

    if (!boardId) {
      return NextResponse.json({ error: 'boardId query parameter is required' }, { status: 400 });
    }

    // Verify card belongs to this board
    const card = await cards.findOne({
      _id: toId(cardId),
      boardId: toId(boardId),
    });

    if (!card) {
      return NextResponse.json({ error: 'Card not found on this board' }, { status: 404 });
    }

    const commentList = await comments.find(
      { cardId: toId(cardId) },
      { sort: { createdAt: 1 } }
    );

    return NextResponse.json(commentList);
  } catch (error) {
    console.error('Error fetching agent comments:', error);
    if (isUnauthorizedError(error)) {
      return unauthorizedResponse(error.message);
    }
    if (error instanceof Error && error.message.startsWith('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}
