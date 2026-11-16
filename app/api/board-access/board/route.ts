import { NextRequest, NextResponse } from 'next/server';
import { boards, users, toId } from '@/lib/db/mongo';

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
    const user = await users.findOne({ shareToken });

    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired share link' }, { status: 404 });
    }

    // Get all boards owned by this user
    const boardDocs = await boards.find(
      { ownerId: toId(user.id) },
      { sort: { createdAt: 1 } }
    );

    const boardsOut = boardDocs.map((b) => ({ id: b.id, name: b.name }));

    if (boardsOut.length === 0) {
      return NextResponse.json({ error: 'No boards found for this account' }, { status: 404 });
    }

    return NextResponse.json({
      boards: boardsOut,
      boardName: boardsOut[0].name, // primary board name for backwards compat with join page
      boardId: boardsOut[0].id,     // primary board id for backwards compat
    });
  } catch (error) {
    console.error('Error looking up account:', error);
    return NextResponse.json({ error: 'Failed to look up account' }, { status: 500 });
  }
}
