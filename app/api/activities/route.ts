import { NextRequest, NextResponse } from 'next/server';
import { activities, boards, cards, toId } from '@/lib/db/mongo';
import { verifyAuth, isUnauthorizedError, unauthorizedResponse } from '@/lib/auth/helpers';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const userId = await verifyAuth(request);

    const { searchParams } = new URL(request.url);
    const cardId = searchParams.get('cardId');

    if (!cardId) {
      return NextResponse.json({ error: 'cardId is required' }, { status: 400 });
    }

    // Verify the card belongs to a board owned by this user
    const card = /^[a-fA-F0-9]{24}$/.test(cardId)
      ? await cards.findOne({ _id: toId(cardId) })
      : null;

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

    const activityDocs = await activities.find(
      { cardId: toId(cardId) },
      { sort: { createdAt: -1 } }
    );

    return NextResponse.json(activityDocs);
  } catch (error) {
    console.error('Error fetching activities:', error);
    if (isUnauthorizedError(error)) {
      return unauthorizedResponse(error.message);
    }
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
  }
}
