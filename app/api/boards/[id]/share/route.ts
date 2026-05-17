import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAuth } from '@/lib/auth/helpers';
import crypto from 'crypto';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const userId = await verifyAuth(request);
    const { id: boardId } = await context.params;

    // Verify board ownership
    const board = await prisma.board.findFirst({
      where: { id: boardId, ownerId: userId },
    });

    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    // Generate share token if not exists
    let shareToken = board.shareToken;
    if (!shareToken) {
      shareToken = crypto.randomUUID();
      await prisma.board.update({
        where: { id: boardId },
        data: { shareToken },
      });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    return NextResponse.json({
      shareUrl: `${appUrl}/join/${shareToken}`,
      shareToken,
    });
  } catch (error) {
    console.error('Error generating share link:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to generate share link' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const userId = await verifyAuth(request);
    const { id: boardId } = await context.params;

    const board = await prisma.board.findFirst({
      where: { id: boardId, ownerId: userId },
    });

    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    await prisma.board.update({
      where: { id: boardId },
      data: { shareToken: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error revoking share link:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to revoke share link' }, { status: 500 });
  }
}
