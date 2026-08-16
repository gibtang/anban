import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { verifyAuth } from '@/lib/auth/helpers';

export const runtime = 'nodejs';

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

/**
 * Advance the user's feed "last seen" marker to now.
 * Best-effort: a failed marker write must never break the feed itself.
 */
async function stampLastFeedSeenAt(userId: string): Promise<void> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { lastFeedSeenAt: new Date() },
    });
  } catch (error) {
    console.error('Failed to stamp lastFeedSeenAt:', error);
  }
}

interface FeedBoardRow {
  id: string;
  name: string;
}

interface FeedActivityRow {
  id: string;
  type: string;
  cardId: string;
  boardId: string;
  authorName: string;
  authorType: string;
  details: unknown;
  createdAt: Date;
}

interface FeedCardRow {
  id: string;
  title: string;
}

/**
 * Global activity feed: card updates across ALL boards owned by the
 * authenticated user, newest first, keyset-paginated.
 *
 * GET /api/activities/feed?limit=30&cursorCreatedAt=<iso>&cursorId=<id>
 * Auth: browser session cookie (verifyAuth) — not available to agent tokens.
 *
 * Response: {
 *   activities: Array<{
 *     id, type, cardId, cardTitle | null, boardId, boardName,
 *     authorName, authorType, details, createdAt (ISO string)
 *   }>,
 *   nextCursor: { createdAt, id } | null,
 *   lastSeenAt: string | null  // PREVIOUS User.lastFeedSeenAt, initial load only
 * }
 *
 * Visit semantics: the FIRST page of a visit (no cursor params) stamps
 * User.lastFeedSeenAt = now AFTER a successful query and returns the
 * previous value as `lastSeenAt` so the client can badge items newer
 * than it. Paginated requests never re-stamp and return lastSeenAt: null.
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await verifyAuth(request);

    const { searchParams } = new URL(request.url);
    const limitRaw = parseInt(searchParams.get('limit') ?? '', 10);
    const limit = Math.min(
      Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : DEFAULT_LIMIT,
      MAX_LIMIT,
    );
    const cursorCreatedAt = searchParams.get('cursorCreatedAt');
    const cursorId = searchParams.get('cursorId');
    // Only the first page of a visit advances the "last seen" marker;
    // pagination requests (cursor present) must not re-stamp, or "new"
    // dots would silently vanish while the user scrolls older history.
    const isInitialLoad = !(cursorCreatedAt && cursorId);

    let previousSeenAt: Date | null = null;
    if (isInitialLoad) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { lastFeedSeenAt: true },
      });
      previousSeenAt = user?.lastFeedSeenAt ?? null;
    }

    const boards = (await prisma.board.findMany({
      where: { ownerId: userId },
      select: { id: true, name: true },
    })) as unknown as FeedBoardRow[];

    if (boards.length === 0) {
      await stampLastFeedSeenAt(userId);
      return NextResponse.json({
        activities: [],
        nextCursor: null,
        lastSeenAt: previousSeenAt?.toISOString() ?? null,
      });
    }

    const where: Prisma.ActivityWhereInput = {
      boardId: { in: boards.map((b) => b.id) },
    };

    // Keyset pagination on (createdAt DESC, id DESC) so equal timestamps
    // straddling a page boundary are neither skipped nor duplicated.
    if (cursorCreatedAt && cursorId) {
      const createdAt = new Date(cursorCreatedAt);
      if (!Number.isNaN(createdAt.getTime())) {
        where.OR = [
          { createdAt: { lt: createdAt } },
          { createdAt: createdAt, id: { lt: cursorId } },
        ];
      }
    }

    const fetched = (await prisma.activity.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    })) as unknown as FeedActivityRow[];

    const hasMore = fetched.length > limit;
    const page = hasMore ? fetched.slice(0, limit) : fetched;

    // Enrich with card titles (cards may be deleted — title becomes null)
    const cardIds = [...new Set(page.map((a) => a.cardId))];
    const cards = cardIds.length
      ? ((await prisma.card.findMany({
          where: { id: { in: cardIds } },
          select: { id: true, title: true },
        })) as unknown as FeedCardRow[])
      : [];
    const cardById = new Map(cards.map((c) => [c.id, c.title]));
    const boardById = new Map(boards.map((b) => [b.id, b.name]));

    const activities = page.map((a) => ({
      id: a.id,
      type: a.type,
      cardId: a.cardId,
      cardTitle: cardById.get(a.cardId) ?? null,
      boardId: a.boardId,
      boardName: boardById.get(a.boardId) ?? 'Unknown board',
      authorName: a.authorName,
      authorType: a.authorType,
      details: a.details ?? null,
      createdAt: a.createdAt.toISOString(),
    }));

    const last = page[page.length - 1];
    const nextCursor =
      hasMore && last
        ? { createdAt: last.createdAt.toISOString(), id: last.id }
        : null;

    // Stamp only after the query succeeded, so a failed fetch doesn't
    // advance the marker. `lastSeenAt` is the PREVIOUS value — the client
    // marks activities newer than it with a "new" indicator.
    if (isInitialLoad) {
      await stampLastFeedSeenAt(userId);
    }

    return NextResponse.json({
      activities,
      nextCursor,
      lastSeenAt: isInitialLoad
        ? previousSeenAt?.toISOString() ?? null
        : null,
    });
  } catch (error) {
    console.error('Error fetching activity feed:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch activity feed' },
      { status: 500 },
    );
  }
}
