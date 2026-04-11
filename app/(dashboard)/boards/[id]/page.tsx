'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useEventSource } from '@/lib/hooks/useEventSource';
import { mutate } from 'swr';
import KanbanBoard from '@/components/kanban/KanbanBoard';

export default function BoardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const boardId = params.id as string;
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [_selectedColumnId, setSelectedColumnId] = useState<string | null>(null);

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
          <div>
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
        </div>
      </div>

      {/* Kanban Board with Drag-and-Drop */}
      <div className="flex-1 overflow-hidden">
        <KanbanBoard boardId={boardId} />
      </div>

      {/* Add Card Modal - Placeholder for Task 2.4 */}
      {showAddCardModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => {
                setShowAddCardModal(false);
                setSelectedColumnId(null);
              }}
            />
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">
              &#8203;
            </span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg
                      className="h-6 w-6 text-indigo-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                      />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Add Card
                    </h3>
                    <div className="mt-4">
                      <p className="text-sm text-gray-500">
                        Card modal will be implemented in Task 2.4
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCardModal(false);
                    setSelectedColumnId(null);
                  }}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
