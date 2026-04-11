'use client';

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
}

export default function KanbanColumn({
  column,
  cards,
  activeCardId,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: 'column',
      column,
    },
  });

  const cardIds = cards.map((card) => card.id);

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
        {cards.length === 0 && (
          <div className="flex items-center justify-center py-8 text-sm text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
            No cards
          </div>
        )}
      </div>
    </div>
  );
}
