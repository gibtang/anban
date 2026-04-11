'use client';

import { useState, useCallback, useMemo } from 'react';
import useSWR, { mutate } from 'swr';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import {
  sortableKeyboardCoordinates,
  arrayMove,
} from '@dnd-kit/sortable';
import type { Card } from '@/types/card';
import KanbanColumn from './KanbanColumn';
import KanbanCard from './KanbanCard';
import { KanbanBoardSkeleton } from '@/components/skeletons/CardSkeleton';
import { EmptyBoard } from '@/components/empty/EmptyBoard';
import { useToast } from '@/components/toast/ToastProvider';
import { fetchWithRetry } from '@/lib/utils/retry';

interface BoardData {
  id: string;
  name: string;
  columns: Array<{
    id: string;
    name: string;
    position: number;
    cards: Card[];
  }>;
}

const fetcher = async (url: string) => {
  try {
    const res = await fetchWithRetry(url);
    return res.json();
  } catch (error) {
    console.error('Failed to fetch board:', error);
    throw error;
  }
};

interface KanbanBoardProps {
  boardId: string;
}

export default function KanbanBoard({ boardId }: KanbanBoardProps) {
  const toast = useToast();
  const { data: board, error, isLoading } = useSWR<BoardData>(
    `/api/boards/${boardId}`,
    fetcher,
    {
      onError: (error) => {
        console.error('Error loading board:', error);
        toast.showToast('Failed to load board. Please try again.', 'error');
      },
    }
  );

  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [optimisticBoard, setOptimisticBoard] = useState<BoardData | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Use optimistic data if available, otherwise use server data
  const displayBoard = optimisticBoard ?? board;

  // Build a map of columnId -> cards for quick lookup
  const columnCardsMap = useMemo(() => {
    if (!displayBoard) return new Map<string, Card[]>();
    const map = new Map<string, Card[]>();
    for (const column of displayBoard.columns) {
      map.set(column.id, column.cards);
    }
    return map;
  }, [displayBoard]);

  // Find which column a card belongs to
  const findColumnForCard = useCallback(
    (cardId: string): string | null => {
      if (!displayBoard) return null;
      for (const column of displayBoard.columns) {
        if (column.cards.some((card) => card.id === cardId)) {
          return column.id;
        }
      }
      return null;
    },
    [displayBoard]
  );

  // Get the active card object
  const activeCard = useMemo(() => {
    if (!activeCardId || !displayBoard) return null;
    for (const column of displayBoard.columns) {
      const found = column.cards.find((card) => card.id === activeCardId);
      if (found) return found;
    }
    return null;
  }, [activeCardId, displayBoard]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveCardId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      if (!displayBoard) return;

      const { active, over } = event;
      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      // Find which columns the active and over items belong to
      const activeColumnId = findColumnForCard(activeId);
      let overColumnId: string | null = null;

      // Check if over is a column (droppable) or a card (sortable)
      const overIsColumn = displayBoard.columns.some(
        (col) => col.id === overId
      );

      if (overIsColumn) {
        overColumnId = overId;
      } else {
        overColumnId = findColumnForCard(overId);
      }

      if (!activeColumnId || !overColumnId || activeColumnId === overColumnId) {
        return;
      }

      // Moving between columns: optimistic update
      setOptimisticBoard((prev) => {
        const base = prev ?? displayBoard;
        const newColumns = base.columns.map((col) => {
          if (col.id === activeColumnId) {
            // Remove card from source column
            const newCards = col.cards.filter(
              (card) => card.id !== activeId
            );
            return { ...col, cards: newCards };
          }
          if (col.id === overColumnId) {
            // Add card to target column
            const cardToMove = base.columns
              .flatMap((c) => c.cards)
              .find((card) => card.id === activeId);

            if (!cardToMove) return col;

            const newCards = [...col.cards];

            if (overIsColumn) {
              // Drop at end of column
              newCards.push({
                ...cardToMove,
                columnId: overColumnId,
              });
            } else {
              // Drop at position of over card
              const overIndex = newCards.findIndex(
                (card) => card.id === overId
              );
              newCards.splice(overIndex, 0, {
                ...cardToMove,
                columnId: overColumnId,
              });
            }

            return { ...col, cards: newCards };
          }
          return col;
        });
        return { ...base, columns: newColumns };
      });
    },
    [displayBoard, findColumnForCard]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      if (!displayBoard) return;

      const { active, over } = event;
      setActiveCardId(null);

      if (!over) {
        setOptimisticBoard(null);
        return;
      }

      const activeId = active.id as string;
      const overId = over.id as string;

      // Same item dropped on itself
      if (activeId === overId) {
        setOptimisticBoard(null);
        return;
      }

      const activeColumnId = findColumnForCard(activeId);
      const overIsColumn = displayBoard.columns.some(
        (col) => col.id === overId
      );
      let overColumnId: string | null = null;

      if (overIsColumn) {
        overColumnId = overId;
      } else {
        overColumnId = findColumnForCard(overId);
      }

      if (!activeColumnId || !overColumnId) {
        setOptimisticBoard(null);
        return;
      }

      // Apply optimistic reorder within the same column or finalize cross-column move
      setOptimisticBoard((prev) => {
        const base = prev ?? displayBoard;
        const newColumns = base.columns.map((col) => {
          if (col.id === overColumnId) {
            const cards = [...col.cards];
            const oldIndex = cards.findIndex((c) => c.id === activeId);
            const newIndex = overIsColumn
              ? cards.length - 1
              : cards.findIndex((c) => c.id === overId);

            if (oldIndex !== -1 && newIndex !== -1) {
              const reordered = arrayMove(cards, oldIndex, newIndex);
              return {
                ...col,
                cards: reordered.map((card, i) => ({
                  ...card,
                  columnId: overColumnId!,
                  position: i,
                })),
              };
            }
          }
          return col;
        });
        return { ...base, columns: newColumns };
      });

      // Determine final position from optimistic state
      const targetColumnId = overColumnId;
      const optimisticState = optimisticBoard ?? displayBoard;
      const targetColumn = optimisticState.columns.find(
        (col) => col.id === targetColumnId
      );
      const finalIndex = targetColumn
        ? targetColumn.cards.findIndex((c) => c.id === activeId)
        : 0;

      // Persist to API
      try {
        await fetchWithRetry(`/api/cards/${activeId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            columnId: targetColumnId,
            position: finalIndex >= 0 ? finalIndex : 0,
          }),
        });

        mutate(`/api/boards/${boardId}`);
        setOptimisticBoard(null);
      } catch (error) {
        console.error('Failed to move card:', error);
        toast.showToast('Failed to move card. Please try again.', 'error');
        setOptimisticBoard(null);
        mutate(`/api/boards/${boardId}`);
      }
    },
    [displayBoard, findColumnForCard, boardId, optimisticBoard]
  );

  const handleDragCancel = useCallback(() => {
    setActiveCardId(null);
    setOptimisticBoard(null);
  }, []);

  if (isLoading) {
    return <KanbanBoardSkeleton />;
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading board</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>Failed to load the board. Please try again later.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!displayBoard) {
    return <EmptyBoard boardName="this board" />;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {displayBoard.columns
          .sort((a, b) => a.position - b.position)
          .map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              cards={columnCardsMap.get(column.id) ?? column.cards}
              activeCardId={activeCardId}
            />
          ))}
      </div>

      {/* Drag overlay for smooth drag experience */}
      <DragOverlay dropAnimation={{
        duration: 200,
        easing: 'ease',
      }}>
        {activeCard ? (
          <div className="opacity-90 rotate-2">
            <KanbanCard card={activeCard} isDragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
