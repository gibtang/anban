'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Card } from '@/types/card';

interface KanbanCardProps {
  card: Card;
  isDragging?: boolean;
}

export default function KanbanCard({ card, isDragging }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: card.id,
    data: {
      type: 'card',
      card,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isDragActive = isDragging ?? isSortableDragging;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        group relative bg-white rounded-lg shadow-sm border border-gray-200 p-3
        cursor-grab active:cursor-grabbing select-none
        transition-shadow duration-200
        hover:shadow-md hover:border-gray-300
        ${isDragActive ? 'opacity-50 shadow-lg ring-2 ring-indigo-400 z-50 scale-105' : 'opacity-100'}
      `}
    >
      {/* Card title */}
      <h4 className="text-sm font-medium text-gray-900 leading-snug mb-2">
        {card.title}
      </h4>

      {/* Card metadata row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Assignee avatar */}
          {card.assigneeId && (
            <div
              className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center"
              title={card.assigneeId}
            >
              <span className="text-[10px] font-medium text-white">
                {card.assigneeId.slice(0, 1).toUpperCase()}
              </span>
            </div>
          )}

          {/* Agent badge */}
          {card.agentId && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800">
              {card.agentId.slice(0, 8)}
            </span>
          )}

          {/* Tags */}
          {card.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
