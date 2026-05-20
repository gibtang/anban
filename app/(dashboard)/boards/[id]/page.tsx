'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR, { mutate } from 'swr';
import { useEventSource } from '@/lib/hooks/useEventSource';
import KanbanBoard from '@/components/kanban/KanbanBoard';
import SharePanel from '@/components/board/SharePanel';
import AccessRequests from '@/components/board/AccessRequests';
import { useToast } from '@/components/toast/ToastProvider';
import { fetchWithRetry } from '@/lib/utils/retry';

interface BoardData {
  id: string;
  name: string;
}

const boardFetcher = async (url: string) => {
  const res = await fetchWithRetry(url);
  return res.json();
};

export default function BoardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const boardId = params.id as string;

  const { event, connected } = useEventSource(boardId);

  // Fetch board name (full board data is fetched separately in KanbanBoard)
  const { data: board } = useSWR<BoardData>(`/api/boards/${boardId}`, boardFetcher);

  // Inline rename state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartRename = () => {
    if (!board?.name) return;
    setEditName(board.name);
    setIsEditing(true);
  };

  const handleSaveRename = async () => {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === board?.name) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetchWithRetry(`/api/boards/${boardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });

      if (!res.ok) {
        throw new Error('Failed to rename board');
      }

      await mutate(`/api/boards/${boardId}`);
      toast.showToast('Board renamed', 'success');
    } catch {
      toast.showToast('Failed to rename board', 'error');
    } finally {
      setIsSaving(false);
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveRename();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  // Handle real-time updates by revalidating the board data
  if (
    event &&
    (event.type === 'card.created' ||
      event.type === 'card.moved' ||
      event.type === 'card.updated' ||
      event.type === 'card.deleted')
  ) {
    mutate(`/api/boards/${boardId}`);
  }

  return (
    <div className="h-full flex flex-col">
      {/* Board Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push('/boards')}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          {/* Board Name — inline editable */}
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleSaveRename}
              onKeyDown={handleKeyDown}
              disabled={isSaving}
              className="text-xl font-bold text-gray-900 border-b-2 border-indigo-500 bg-transparent outline-none py-0.5 min-w-[120px]"
            />
          ) : (
            <button
              onClick={handleStartRename}
              className="text-xl font-bold text-gray-900 hover:text-indigo-600 transition-colors group flex items-center gap-1.5"
              title="Click to rename"
            >
              {board?.name || '...'}
              <svg
                className="h-4 w-4 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
            </button>
          )}

          <div className="flex items-center space-x-2">
            <div
              className={`h-2 w-2 rounded-full ${
                connected ? 'bg-green-500' : 'bg-gray-500'
              }`}
            />
            <p className="text-sm text-gray-500">
              {connected ? 'Live' : 'Disconnected'}
            </p>
          </div>
        </div>

        {/* Share & Agent Access */}
        <div className="flex items-center space-x-3">
          <AccessRequests boardId={boardId} />
          <SharePanel boardId={boardId} />
        </div>
      </div>

      {/* Kanban Board with Drag-and-Drop */}
      <div className="flex-1 overflow-hidden">
        <KanbanBoard boardId={boardId} />
      </div>
    </div>
  );
}
