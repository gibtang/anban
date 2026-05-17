import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const runtime = 'nodejs';

/**
 * Public endpoint: get board name from share token
 * Used by the join page to show which board the agent is requesting access to
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shareToken = searchParams.get('shareToken');

    if (!shareToken) {
      return NextResponse.json({ error: 'shareToken is required' }, { status: 400 });
    }

    const board = await prisma.board.findUnique({
      where: { shareToken },
      select: { id: true, name: true },
    });

    if (!board) {
      return NextResponse.json({ error: 'Invalid or expired share link' }, { status: 404 });
    }

    return NextResponse.json({ boardName: board.name, boardId: board.id });
  } catch (error) {
    console.error('Error looking up board:', error);
    return NextResponse.json({ error: 'Failed to look up board' }, { status: 500 });
  }
}
