'use client';

import { useState, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { Card } from '@/types/card';
import KanbanCard from './KanbanCard';

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
  agentNames: Record<string, string>;
  agentTokensMap: Record<string, string>;
  defaultCollapsed?: boolean;
  onEditCard?: (card: Card) => void;
  onAddCard?: (columnId: string) => void;
}

export default function KanbanColumn({
  column,
  cards,
  activeCardId,
  boardId,
  agentNames,
  agentTokensMap,
  defaultCollapsed = false,
  onEditCard,
  onAddCard,
}: KanbanColumnProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  // Sync if defaultCollapsed changes (e.g., on initial load)
  useEffect(() => {
    setCollapsed(defaultCollapsed);
  }, [defaultCollapsed]);

  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: 'column',
      column,
    },
  });

  const cardIds = cards.map((card) => card.id);

  if (collapsed) {
    return (
      <div
        className="flex flex-col min-w-[60px] bg-gray-100 rounded-xl px-3 py-3 cursor-pointer hover:bg-gray-200 transition-colors"
        onClick={() => setCollapsed(false)}
      >
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCollapsed(false);
            }}
            className="text-gray-400 hover:text-gray-700 transition-colors"
            title="Expand column"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <h3 className="text-sm font-semibold text-gray-700 text-center">
            {column.name}
          </h3>
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-xs font-medium text-indigo-700">
            {cards.length}
          </span>
        </div>
      </div>
    );
  }

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
          {defaultCollapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="text-gray-400 hover:text-gray-700 transition-colors"
              title="Collapse column"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
          <h3 className="text-sm font-semibold text-gray-700">
            {column.name}
          </h3>
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 text-[11px] font-medium text-gray-600">
            {cards.length}
          </span>
        </div>
        {column.name === 'To Do' && (
          <button
            onClick={() => onAddCard?.(column.id)}
            className="flex items-center gap-0.5 px-1.5 py-0.5 text-sm text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-md transition-colors"
            title="Add card"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        )}
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
              onEdit={() => onEditCard?.(card)}
              agentName={card.agentId ? (agentNames[card.agentId] || null) : null}
              agentToken={card.agentId ? (agentTokensMap[card.agentId] || null) : null}
            />
          ))}
        </SortableContext>

        {/* Empty state when column has no cards */}
        {cards.length === 0 && (
          <div className="flex items-center justify-center py-8 text-sm text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
            No cards
          </div>
        )}
      </div>

    </div>
  );
}
