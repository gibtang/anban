'use client';

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Card } from '@/types/card';

interface KanbanCardProps {
  card: Card;
  isDragging?: boolean;
  onEdit?: () => void;
  agentName?: string | null;
  agentToken?: string | null;
}

export default function KanbanCard({ card, isDragging, onEdit, agentName, agentToken }: KanbanCardProps) {
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

  const [copied, setCopied] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isDragActive = isDragging ?? isSortableDragging;

  const handleCopyUrl = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!agentToken) return;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const url = `${appUrl}/card/${card.id}?token=${agentToken}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

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
      {/* Card header: title + action buttons */}
      <div className="flex items-start justify-between gap-1 mb-2">
        <h4 className="text-sm font-medium text-gray-900 leading-snug flex-1">
          {card.title}
        </h4>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {/* Copy card URL button */}
          {agentToken ? (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={handleCopyUrl}
              className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition-all opacity-0 group-hover:opacity-100"
              title={copied ? 'Copied!' : 'Copy card URL'}
            >
              {copied ? (
                <svg className="h-3.5 w-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              )}
            </button>
          ) : agentName ? (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              className="p-1 rounded text-gray-300 cursor-not-allowed opacity-0 group-hover:opacity-100"
              title="Assign an agent with a token first"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </button>
          ) : null}
          {onEdit && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="flex-shrink-0 p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition-all"
              title="Edit card"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Card metadata row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Agent badge */}
          {agentName ? (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800">
              {agentName}
            </span>
          ) : (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500">
              Unassigned
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
