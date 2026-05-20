import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAgentAuth } from '@/lib/auth/helpers';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const runtime = 'nodejs';

/**
 * Agent endpoint: add a comment to a card
 * POST /api/agent/cards/:cardId/comments
 * Body: { content: string }
 * Headers: Authorization: Bearer <agentToken>
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { boardId, accessId, agentName } = await verifyAgentAuth(request);
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

    // Verify card belongs to this board
    const card = await prisma.card.findFirst({
      where: { id: cardId, boardId },
    });

    if (!card) {
      return NextResponse.json({ error: 'Card not found on this board' }, { status: 404 });
    }

    const comment = await prisma.comment.create({
      data: {
        cardId,
        boardId,
        authorId: accessId,
        authorName: agentName,
        authorType: 'agent',
        content: content.trim(),
      },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('Error creating agent comment:', error);
    if (error instanceof Error && error.message.startsWith('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}

/**
 * Agent endpoint: list comments on a card
 * GET /api/agent/cards/:cardId/comments
 * Headers: Authorization: Bearer <agentToken>
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { boardId } = await verifyAgentAuth(request);
    const { id: cardId } = await context.params;

    // Verify card belongs to this board
    const card = await prisma.card.findFirst({
      where: { id: cardId, boardId },
    });

    if (!card) {
      return NextResponse.json({ error: 'Card not found on this board' }, { status: 404 });
    }

    const comments = await prisma.comment.findMany({
      where: { cardId },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error('Error fetching agent comments:', error);
    if (error instanceof Error && error.message.startsWith('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}
