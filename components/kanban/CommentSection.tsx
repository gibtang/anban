'use client';

import { useState, useEffect, useCallback } from 'react';

interface Comment {
  id: string;
  authorName: string;
  authorType: string;
  content: string;
  createdAt: string;
}

interface CommentSectionProps {
  cardId: string;
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

export function CommentSection({ cardId }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchComments = useCallback(() => {
    setLoading(true);
    fetch(`/api/cards/${cardId}/comments`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setComments(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [cardId]);

  useEffect(() => {
    if (!cardId) return;
    fetchComments();
  }, [cardId, fetchComments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newComment.trim();
    if (!trimmed) return;

    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/cards/${cardId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add comment');
      }

      const comment = await res.json();
      setComments((prev) => [...prev, comment]);
      setNewComment('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Comments
      </label>

      {/* Comments list */}
      <div className="border border-gray-200 rounded-md p-3 max-h-48 overflow-y-auto bg-gray-50/50 space-y-3">
        {loading ? (
          <div className="py-4 text-center">
            <div className="w-5 h-5 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin mx-auto" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">No comments yet.</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex items-start gap-2.5">
              <span className="text-sm mt-0.5 flex-shrink-0">
                {comment.authorType === 'agent' ? '🤖' : '👤'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-700">
                  <span className="font-medium text-gray-900">
                    {comment.authorType === 'user' ? 'You' : comment.authorName}
                  </span>
                </p>
                <p className="text-sm text-gray-600 mt-0.5 whitespace-pre-wrap break-words">
                  {comment.content}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatRelativeTime(comment.createdAt)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add comment form */}
      <form onSubmit={handleSubmit} className="mt-2 flex gap-2">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 min-w-0 border border-gray-300 rounded-md shadow-sm py-1.5 px-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          disabled={isSubmitting}
        />
        <button
          type="submit"
          disabled={isSubmitting || !newComment.trim()}
          className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? '...' : 'Send'}
        </button>
      </form>

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
