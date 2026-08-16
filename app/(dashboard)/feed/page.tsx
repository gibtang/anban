'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { fetchWithRetry } from '@/lib/utils/retry';

interface FeedActivity {
  id: string;
  type: string;
  cardId: string;
  cardTitle: string | null;
  boardId: string;
  boardName: string;
  authorName: string;
  authorType: string;
  details: Record<string, unknown> | null;
  createdAt: string;
}

interface FeedResponse {
  activities: FeedActivity[];
  nextCursor: { createdAt: string; id: string } | null;
  /** Previous visit's lastFeedSeenAt (initial load only; null = keep current) */
  lastSeenAt?: string | null;
}

const PAGE_SIZE = 30;

function getActivityIcon(type: string): string {
  switch (type) {
    case 'created': return '📋';
    case 'moved': return '➡️';
    case 'updated': return '✏️';
    case 'assigned': return '🤖';
    case 'unassigned': return '👤';
    case 'commented': return '💬';
    case 'deleted': return '🗑️';
    default: return '•';
  }
}

function getActivityDescription(activity: FeedActivity): string {
  const details = activity.details;
  switch (activity.type) {
    case 'created':
      return 'created the card';
    case 'moved':
      return `moved it from ${((details?.fromColumn as string) ?? 'Unknown')} to ${((details?.toColumn as string) ?? 'Unknown')}`;
    case 'updated': {
      const fields = (details?.fields as string[]) ?? [];
      return fields.length ? `updated ${fields.join(', ')}` : 'updated the card';
    }
    case 'assigned':
      return `assigned ${activity.authorType === 'user' ? 'an agent' : 'themselves'}`;
    case 'unassigned':
      return 'unassigned the agent';
    case 'commented':
      return 'commented';
    case 'deleted':
      return 'deleted the card';
    default:
      return activity.type;
  }
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

function dayLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round(
    (startOfDay(now) - startOfDay(date)) / (24 * 60 * 60 * 1000),
  );
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  });
}

function groupByDay(activities: FeedActivity[]): [string, FeedActivity[]][] {
  const groups = new Map<string, FeedActivity[]>();
  for (const activity of activities) {
    const label = dayLabel(activity.createdAt);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(activity);
  }
  return [...groups.entries()];
}

export default function FeedPage() {
  const [activities, setActivities] = useState<FeedActivity[]>([]);
  const [cursor, setCursor] = useState<FeedResponse['nextCursor']>(null);
  // Epoch ms of the previous visit's lastFeedSeenAt; 0 = no baseline
  // (first-ever visit or not yet loaded) → nothing is marked "new".
  const [lastSeenAtMs, setLastSeenAtMs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const cursorRef = useRef<FeedResponse['nextCursor']>(null);
  const loadingMoreRef = useRef(false);

  cursorRef.current = cursor;

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithRetry(`/api/activities/feed?limit=${PAGE_SIZE}`);
      if (!res.ok) throw new Error('Failed to load activity feed');
      const data: FeedResponse = await res.json();
      setActivities(data.activities);
      setCursor(data.nextCursor);
      // Initial loads carry the previous visit's marker (null on the very
      // first visit); paginated loads return null and must keep the value.
      if (data.lastSeenAt) setLastSeenAtMs(Date.parse(data.lastSeenAt));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activity feed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const loadMore = useCallback(async () => {
    const current = cursorRef.current;
    if (!current || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        cursorCreatedAt: current.createdAt,
        cursorId: current.id,
      });
      const res = await fetchWithRetry(`/api/activities/feed?${params}`);
      if (!res.ok) throw new Error('Failed to load more activity');
      const data: FeedResponse = await res.json();
      setActivities((prev) => {
        const seen = new Set(prev.map((a) => a.id));
        return [...prev, ...data.activities.filter((a) => !seen.has(a.id))];
      });
      setCursor(data.nextCursor);
    } catch {
      // Non-fatal: user can scroll/retry via the button below.
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, []);

  // Infinite scroll: load older items when the sentinel enters view.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMore();
      },
      { rootMargin: '200px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity Feed</h1>
          <p className="text-sm text-gray-500 mt-1">
            Card updates across all your boards, newest first.
          </p>
        </div>
        <button
          onClick={loadInitial}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-600 bg-white hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
        >
          <svg
            className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh
        </button>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3" aria-label="Loading activity feed">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-sm text-red-600 mb-3">{error}</p>
          <button
            onClick={loadInitial}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && activities.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <span className="text-3xl">📭</span>
          <h2 className="mt-3 text-lg font-semibold text-gray-900">
            No activity yet
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Updates from your boards — cards created, moved, assigned, and
            commented — will appear here.
          </p>
          <Link
            href="/boards"
            className="mt-4 inline-block px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors"
          >
            Go to boards
          </Link>
        </div>
      )}

      {/* Feed */}
      {!loading && !error && activities.length > 0 && (
        <div className="space-y-6">
          {groupByDay(activities).map(([label, items]) => (
            <section key={label}>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2 px-1 sticky top-16 bg-gray-50 py-1 z-10">
                {label}
              </h2>
              <div className="space-y-2">
                {items.map((activity) => (
                  <Link
                    key={activity.id}
                    href={`/boards/${activity.boardId}`}
                    className="block bg-white border border-gray-200 rounded-lg p-4 hover:border-indigo-300 hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-lg mt-0.5 flex-shrink-0">
                        {getActivityIcon(activity.type)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-700">
                          <span className="font-medium text-gray-900">
                            {activity.authorType === 'user'
                              ? 'You'
                              : activity.authorName}
                          </span>{' '}
                          {getActivityDescription(activity)}
                          {activity.cardTitle && (
                            <span className="font-medium text-gray-900">
                              {' '}
                              on “{activity.cardTitle}”
                            </span>
                          )}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 group-hover:bg-indigo-100">
                            {activity.boardName}
                          </span>
                          {lastSeenAtMs > 0 &&
                            Date.parse(activity.createdAt) > lastSeenAtMs && (
                              <span
                                title="New since your last visit"
                                aria-label="New since your last visit"
                                className="inline-block h-2 w-2 rounded-full bg-indigo-500"
                              />
                            )}
                          <span className="text-xs text-gray-400">
                            {formatRelativeTime(activity.createdAt)}
                          </span>
                        </div>
                      </div>
                      <svg
                        className="h-4 w-4 text-gray-300 group-hover:text-indigo-400 flex-shrink-0 mt-1 transition-colors"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}

          {/* Infinite-scroll sentinel + manual fallback */}
          <div ref={sentinelRef} className="py-4 text-center">
            {cursor ? (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-600 bg-white hover:bg-gray-50 disabled:opacity-60 transition-colors"
              >
                {loadingMore && (
                  <span className="w-4 h-4 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
                )}
                {loadingMore ? 'Loading…' : 'Load older activity'}
              </button>
            ) : (
              <p className="text-xs text-gray-400">
                You&apos;ve reached the beginning 🎉
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
