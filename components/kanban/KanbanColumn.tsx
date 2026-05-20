'use client';

import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import useSWR, { mutate } from 'swr';
import type { Card } from '@/types/card';
import KanbanCard from './KanbanCard';
import { useToast } from '@/components/toast/ToastProvider';
import { fetchWithRetry } from '@/lib/utils/retry';

interface Column {
  id: string;
  name: string;
  position: number;
}

interface KanbanColumnProps {
  column: Column;
  cards: Card[];
  activeCardId: string | null;
  boardId: string;
}

export default function KanbanColumn({
  column,
  cards,
  activeCardId,
  boardId,
}: KanbanColumnProps) {
  const toast = useToast();
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: 'column',
      column,
    },
  });

  const [isAdding, setIsAdding] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const cardIds = cards.map((card) => card.id);

  const handleAddCard = async () => {
    const title = newCardTitle.trim();
    if (!title) return;

    setIsCreating(true);
    try {
      const res = await fetchWithRetry('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          columnId: column.id,
          boardId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create card');
      }

      setNewCardTitle('');
      setIsAdding(false);
      mutate(`/api/boards/${boardId}`);
      toast.showToast('Card created', 'success');
    } catch (err) {
      toast.showToast(err instanceof Error ? err.message : 'Failed to create card', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCard();
    } else if (e.key === 'Escape') {
      setIsAdding(false);
      setNewCardTitle('');
    }
  };

  return (
    <div
      className={`
        flex flex-col min-w-[280px] max-w-[280px] bg-gray-100 rounded-xl
        transition-colors duration-200
        ${isOver ? 'bg-indigo-50 ring-2 ring-indigo-300 ring-inset' : ''}
      `}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-700">
            {column.name}
          </h3>
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 text-[11px] font-medium text-gray-600">
            {cards.length}
          </span>
        </div>
      </div>

      {/* Cards list */}
      <div
        ref={setNodeRef}
        className="flex flex-col flex-1 gap-2 px-2 pb-2 min-h-[100px]"
      >
        <SortableContext
          items={cardIds}
          strategy={verticalListSortingStrategy}
        >
          {cards.map((card) => (
            <KanbanCard
              key={card.id}
              card={card}
              isDragging={activeCardId === card.id}
            />
          ))}
        </SortableContext>

        {/* Empty state / drop target when column is empty */}
        {cards.length === 0 && !isAdding && (
          <div className="flex items-center justify-center py-8 text-sm text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
            No cards
          </div>
        )}
      </div>

      {/* Add card */}
      <div className="px-2 pb-2">
        {isAdding ? (
          <div className="space-y-2">
            <textarea
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter card title..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              rows={2}
              autoFocus
              disabled={isCreating}
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleAddCard}
                disabled={!newCardTitle.trim() || isCreating}
                className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isCreating ? 'Adding...' : 'Add Card'}
              </button>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setNewCardTitle('');
                }}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full flex items-center gap-1.5 px-2 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add card
          </button>
        )}
      </div>
    </div>
  );
}
