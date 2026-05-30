import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const runtime = 'nodejs';

/**
 * Public endpoint: get account info from share token
 * Used by the join page to show which account (and boards) the agent is requesting access to
 *
 * Now resolves User.shareToken instead of Board.shareToken
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shareToken = searchParams.get('shareToken');

    if (!shareToken) {
      return NextResponse.json({ error: 'shareToken is required' }, { status: 400 });
    }

    // Look up user by account-level share token
    const user = await prisma.user.findUnique({
      where: { shareToken },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired share link' }, { status: 404 });
    }

    // Get all boards owned by this user
    const boards = await prisma.board.findMany({
      where: { ownerId: user.id },
      select: { id: true, name: true },
      orderBy: { createdAt: 'asc' },
    }) as { id: string; name: string }[];

    if (boards.length === 0) {
      return NextResponse.json({ error: 'No boards found for this account' }, { status: 404 });
    }

    return NextResponse.json({
      boards,
      boardName: boards[0].name, // primary board name for backwards compat with join page
      boardId: boards[0].id,     // primary board id for backwards compat
    });
  } catch (error) {
    console.error('Error looking up account:', error);
    return NextResponse.json({ error: 'Failed to look up account' }, { status: 500 });
  }
}
