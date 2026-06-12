'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Board } from '@/types/board';
import { BoardListSkeleton } from '@/components/skeletons/BoardSkeleton';
import { EmptyBoards } from '@/components/empty/EmptyBoards';
import { useToast } from '@/components/toast/ToastProvider';
import { fetchWithRetry } from '@/lib/utils/retry';
import SharePanel from '@/components/board/SharePanel';

const fetcher = async (url: string) => {
  try {
    const res = await fetchWithRetry(url);
    return res.json();
  } catch (error) {
    console.error('Failed to fetch boards:', error);
    throw error;
  }
};

export default function BoardsPage() {
  const router = useRouter();
  const toast = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [boardName, setBoardName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [isRetrying, setIsRetrying] = useState(false);
  const [archiveBoardId, setArchiveBoardId] = useState<string | null>(null);
  const [archiveBoardName, setArchiveBoardName] = useState('');
  const [isArchiving, setIsArchiving] = useState(false);
  const [togglingFavId, setTogglingFavId] = useState<string | null>(null);

  const { data: boards, error, isLoading, mutate: mutateBoards } = useSWR<Board[]>('/api/boards', fetcher, {
    onError: (error) => {
      console.error('Error loading boards:', error);
      toast.showToast('Failed to load boards. Please try again.', 'error');
    },
  });

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setCreateError('');

    try {
      const res = await fetchWithRetry('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: boardName }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create board');
      }

      const newBoard = await res.json();
      await mutateBoards();
      setShowCreateModal(false);
      setBoardName('');
      toast.showToast('Board created successfully!', 'success');
      router.push(`/boards/${newBoard.id}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create board';
      setCreateError(errorMessage);
      toast.showToast(errorMessage, 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await mutateBoards();
      toast.showToast('Successfully reloaded boards', 'success');
    } catch (error) {
      toast.showToast('Failed to reload boards. Please try again.', 'error');
    } finally {
      setIsRetrying(false);
    }
  };

  const handleArchiveBoard = async () => {
    if (!archiveBoardId) return;
    setIsArchiving(true);
    try {
      const res = await fetchWithRetry(`/api/boards/${archiveBoardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: true }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to archive board');
      }
      await mutateBoards();
      toast.showToast(`"${archiveBoardName}" archived`, 'success');
      setArchiveBoardId(null);
      setArchiveBoardName('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to archive board';
      toast.showToast(errorMessage, 'error');
    } finally {
      setIsArchiving(false);
    }
  };

  const handleToggleFavorite = async (boardId: string, currentFav: boolean) => {
    setTogglingFavId(boardId);
    try {
      const res = await fetchWithRetry(`/api/boards/${boardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favorited: !currentFav }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update board');
      }
      await mutateBoards();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update favorite';
      toast.showToast(errorMessage, 'error');
    } finally {
      setTogglingFavId(null);
    }
  };

  const getOrdinal = (n: number): string => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return 'Just now'; // Guard against clock skew
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return `${getOrdinal(date.getDate())} ${date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`;
  };

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Boards</h1>
          {boards && boards.length > 0 && (
            <p className="mt-1 text-sm text-gray-500">
              {boards.length} {boards.length === 1 ? 'board' : 'boards'}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <SharePanel />
          <Link
            href="/boards/archived"
            className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            Archived
          </Link>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Board
          </button>
        </div>
      </div>

      {/* Content states */}
      {isLoading ? (
        <BoardListSkeleton />
      ) : error ? (
        <div className="rounded-lg bg-red-50 border border-red-200 p-6">
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-sm font-semibold text-red-800">Failed to load boards</h3>
              <p className="mt-1 text-sm text-red-600">Something went wrong. Please try again.</p>
              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className="mt-3 inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isRetrying ? 'Retrying...' : (
                  <>
                    <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Retry
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : !boards || boards.length === 0 ? (
        <EmptyBoards onCreate={() => setShowCreateModal(true)} />
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((board) => (
            <div
              key={board.id}
              className="group relative p-5 bg-white rounded-lg border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all"
            >
              {/* Delete button + Favorite button */}
              <div className={`absolute top-3 right-3 flex items-center gap-1 transition-all ${board.favorited ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleToggleFavorite(board.id, board.favorited ?? false);
                  }}
                  disabled={togglingFavId === board.id}
                  className={`p-1.5 rounded-md transition-colors ${board.favorited ? 'text-amber-400 hover:text-gray-400 hover:bg-gray-50' : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50'}`}
                  title={board.favorited ? 'Unfavorite' : 'Favorite'}
                >
                  <svg
                    className="h-4 w-4"
                    fill={board.favorited ? 'currentColor' : 'none'}
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={board.favorited ? 0 : 2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setArchiveBoardId(board.id);
                    setArchiveBoardName(board.name);
                  }}
                  className="p-1.5 rounded-md text-gray-400 hover:text-amber-500 hover:bg-amber-50 transition-colors"
                  title="Archive board"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                </button>
              </div>

              {/* Clickable card content */}
              <Link href={`/boards/${board.id}`} className="block">
                {/* Board name */}
                <h3 className="text-base font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors pr-8">
                  {board.name}
                </h3>

                {/* Card counts */}
                <div className="mt-2 flex items-center gap-3 text-sm">
                  {(board._count?.cards ?? 0) > 0 ? (
                    <>
                      <span className="text-gray-500">
                        {board._count?.cards} {board._count?.cards === 1 ? 'card' : 'cards'}
                      </span>
                      {(board.openCardCount ?? 0) > 0 && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">
                          {board.openCardCount} open
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-emerald-600 font-medium">0 cards</span>
                  )}
                </div>

                {/* Timestamp */}
                <p className="mt-3 text-xs text-gray-400">
                  Updated {formatDate(board.updatedAt)}
                </p>
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Create Board Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-gray-900/50 transition-opacity"
            onClick={() => {
              setShowCreateModal(false);
              setBoardName('');
              setCreateError('');
            }}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900">Create Board</h2>
            <form
              onSubmit={handleCreateBoard}
              className="mt-4"
            >
              <label htmlFor="board-name" className="block text-sm font-medium text-gray-700">
                Board Name
              </label>
              <input
                type="text"
                id="board-name"
                value={boardName}
                onChange={(e) => setBoardName(e.target.value)}
                className="mt-1.5 block w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="e.g. Sprint Planning, Bug Tracker"
                autoFocus
                required
              />
              {createError && (
                <p className="mt-2 text-sm text-red-600">{createError}</p>
              )}

              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setBoardName('');
                    setCreateError('');
                  }}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !boardName.trim()}
                  className="px-4 py-2 text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isCreating ? 'Creating...' : (
                    'Create Board'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Archive Board Confirmation Modal */}
      {archiveBoardId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/50 transition-opacity"
            onClick={() => {
              setArchiveBoardId(null);
              setArchiveBoardName('');
            }}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Archive Board</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Archive <span className="font-medium text-gray-700">"{archiveBoardName}"</span>? It will be hidden from your boards list but can be restored anytime from the Archived page.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setArchiveBoardId(null);
                  setArchiveBoardName('');
                }}
                disabled={isArchiving}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleArchiveBoard}
                disabled={isArchiving}
                className="px-4 py-2 text-sm font-medium rounded-lg text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isArchiving ? 'Archiving...' : (
                  'Archive Board'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
