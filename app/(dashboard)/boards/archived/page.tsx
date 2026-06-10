'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import type { Board } from '@/types/board';
import { BoardListSkeleton } from '@/components/skeletons/BoardSkeleton';
import { useToast } from '@/components/toast/ToastProvider';
import { fetchWithRetry } from '@/lib/utils/retry';

const fetcher = async (url: string) => {
  const res = await fetchWithRetry(url);
  return res.json();
};

export default function ArchivedBoardsPage() {
  const toast = useToast();
  const [unarchivingId, setUnarchivingId] = useState<string | null>(null);

  const { data: boards, error, isLoading, mutate } = useSWR<Board[]>(
    '/api/boards?includeArchived=true',
    fetcher,
    {
      onError: (error) => {
        console.error('Error loading archived boards:', error);
        toast.showToast('Failed to load archived boards.', 'error');
      },
    },
  );

  const archivedBoards = boards?.filter((b) => b.archived) ?? [];

  const handleUnarchive = async (boardId: string, boardName: string) => {
    setUnarchivingId(boardId);
    try {
      const res = await fetchWithRetry(`/api/boards/${boardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: false }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to unarchive board');
      }
      await mutate();
      toast.showToast(`"${boardName}" restored`, 'success');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to unarchive board';
      toast.showToast(errorMessage, 'error');
    } finally {
      setUnarchivingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/boards"
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Archived Boards</h1>
          </div>
          {archivedBoards.length > 0 && (
            <p className="mt-1 text-sm text-gray-500">
              {archivedBoards.length} archived {archivedBoards.length === 1 ? 'board' : 'boards'}
            </p>
          )}
        </div>
      </div>

      {/* Content states */}
      {isLoading ? (
        <BoardListSkeleton />
      ) : error ? (
        <div className="rounded-lg bg-red-50 border border-red-200 p-6">
          <p className="text-sm text-red-600">Failed to load archived boards. Please try again.</p>
        </div>
      ) : archivedBoards.length === 0 ? (
        <div className="text-center py-16">
          <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
          <h3 className="mt-3 text-sm font-medium text-gray-900">No archived boards</h3>
          <p className="mt-1 text-sm text-gray-500">
            Boards you archive will appear here. You can restore them anytime.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {archivedBoards.map((board) => (
            <div
              key={board.id}
              className="group relative p-5 bg-white rounded-lg border border-gray-200 hover:border-amber-300 hover:shadow-md transition-all opacity-80 hover:opacity-100"
            >
              {/* Unarchive button */}
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleUnarchive(board.id, board.name);
                  }}
                  disabled={unarchivingId === board.id}
                  className="p-1.5 rounded-md text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                  title="Restore board"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                </button>
              </div>

              <h3 className="text-base font-semibold text-gray-700 truncate pr-8">
                {board.name}
              </h3>

              <div className="mt-2 flex items-center gap-3 text-sm">
                {(board._count?.cards ?? 0) > 0 ? (
                  <span className="text-gray-400">
                    {board._count?.cards} {board._count?.cards === 1 ? 'card' : 'cards'}
                  </span>
                ) : (
                  <span className="text-gray-400 italic">No cards</span>
                )}
              </div>

              <p className="mt-3 text-xs text-gray-400">
                Archived · Updated {formatDate(board.updatedAt)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
