'use client';

import { useState, useEffect } from 'react';

interface Activity {
  id: string;
  type: string;
  authorName: string;
  authorType: string;
  details: Record<string, unknown> | null;
  createdAt: string;
}

interface ActivityLogProps {
  cardId: string;
}

function getActivityDescription(activity: Activity): string {
  const details = activity.details as Record<string, unknown> | null;
  switch (activity.type) {
    case 'created':
      return 'created this card';
    case 'moved':
      return `moved card from ${((details?.fromColumn as string) ?? 'Unknown')} to ${((details?.toColumn as string) ?? 'Unknown')}`;
    case 'updated': {
      const fields = (details?.fields as string[]) ?? [];
      return `updated ${fields.join(', ')}`;
    }
    case 'assigned':
      return 'assigned an agent';
    case 'unassigned':
      return 'unassigned the agent';
    case 'commented':
      return 'commented';
    default:
      return activity.type;
  }
}

function getActivityIcon(type: string): string {
  switch (type) {
    case 'created': return '📋';
    case 'moved': return '➡️';
    case 'updated': return '✏️';
    case 'assigned': return '🤖';
    case 'unassigned': return '👤';
    case 'commented': return '💬';
    default: return '•';
  }
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

export function ActivityLog({ cardId }: ActivityLogProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cardId) return;

    setLoading(true);
    fetch(`/api/activities?cardId=${cardId}`)
      .then((res) => res.ok ? res.json() : [])
      .then((data) => {
        setActivities(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [cardId]);

  if (loading) {
    return (
      <div className="py-4 text-center">
        <div className="w-5 h-5 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-2">No activity yet.</p>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-start gap-2.5">
          <span className="text-sm mt-0.5 flex-shrink-0">{getActivityIcon(activity.type)}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-gray-700">
              <span className="font-medium text-gray-900">
                {activity.authorType === 'user' ? 'You' : activity.authorName}
              </span>{' '}
              {getActivityDescription(activity)}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {formatRelativeTime(activity.createdAt)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
