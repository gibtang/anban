'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEventSource } from '@/lib/hooks/useEventSource';
import { mutate } from 'swr';
import KanbanBoard from '@/components/kanban/KanbanBoard';
import SharePanel from '@/components/board/SharePanel';
import AccessRequests from '@/components/board/AccessRequests';

export default function BoardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const boardId = params.id as string;

  const { event, connected } = useEventSource(boardId);

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
            className="text-gray-400 hover:text-gray-600 transition-colors"
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
          <div className="flex items-center space-x-2">
            <div
              className={`h-2 w-2 rounded-full ${
                connected ? 'bg-green-500' : 'bg-gray-400'
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
