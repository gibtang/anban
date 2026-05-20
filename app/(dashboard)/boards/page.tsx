'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Board } from '@/types/board';
import { BoardListSkeleton } from '@/components/skeletons/BoardSkeleton';
import { EmptyBoards } from '@/components/empty/EmptyBoards';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/toast/ToastProvider';
import { fetchWithRetry } from '@/lib/utils/retry';

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
    return date.toLocaleDateString();
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
                {isRetrying ? (
                  <>
                    <Spinner size="xs" className="mr-1.5 text-red-600" />
                    Retrying...
                  </>
                ) : (
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
            <Link
              key={board.id}
              href={`/boards/${board.id}`}
              className="group block p-5 bg-white rounded-lg border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all"
            >
              {/* Board name */}
              <h3 className="text-base font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                {board.name}
              </h3>

              {/* Card count */}
              {(board._count?.cards ?? 0) > 0 ? (
                <p className="mt-2 text-sm text-gray-500">
                  {board._count?.cards} {board._count?.cards === 1 ? 'card' : 'cards'}
                </p>
              ) : (
                <p className="mt-2 text-sm text-gray-400 italic">No cards yet</p>
              )}

              {/* Timestamp */}
              <p className="mt-3 text-xs text-gray-400">
                Updated {formatDate(board.updatedAt)}
              </p>
            </Link>
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
                  {isCreating ? (
                    <>
                      <Spinner size="xs" className="mr-1.5" />
                      Creating...
                    </>
                  ) : (
                    'Create Board'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
