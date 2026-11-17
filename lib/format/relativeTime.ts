/**
 * Relative time label ("2m ago", "3d ago") as of `nowMs`.
 * Future timestamps read as "Just now"; older than 7 days falls back
 * to `fallback(date)` (absolute date formatting).
 */
export function formatRelativeTime(
  dateString: string,
  nowMs: number,
  fallback: (date: Date) => string = (date) => date.toLocaleDateString()
): string {
  const date = new Date(dateString);
  const diffMs = nowMs - date.getTime();
  if (diffMs < 0) return 'Just now';
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return fallback(date);
}
