'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { mutate } from 'swr';
import type { Card } from '@/types/card';
import apiFetch from '@/lib/apiFetch';

interface AgentOption {
  id: string;
  name: string;
}

interface KanbanCardProps {
  card: Card;
  isDragging?: boolean;
  onEdit?: () => void;
  agentName?: string | null;
  agentToken?: string | null;
  agents?: AgentOption[];
  boardId?: string;
}

export default function KanbanCard({ card, isDragging, onEdit, agentName, agentToken, agents, boardId }: KanbanCardProps) {
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
  const [agentDropdownOpen, setAgentDropdownOpen] = useState(false);
  const [blockedDropdownOpen, setBlockedDropdownOpen] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const blockedDropdownRef = useRef<HTMLDivElement>(null);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isDragActive = isDragging ?? isSortableDragging;

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!agentDropdownOpen && !blockedDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAgentDropdownOpen(false);
      }
      if (blockedDropdownRef.current && !blockedDropdownRef.current.contains(e.target as Node)) {
        setBlockedDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [agentDropdownOpen, blockedDropdownOpen]);

  const handleAssignAgent = useCallback(async (agentId: string | null) => {
    if (!boardId || assigning) return;
    setAssigning(true);
    setAgentDropdownOpen(false);

    // Optimistic: update the local SWR cache
    mutate(`/api/boards/${boardId}`, (current: any) => {
      if (!current) return current;
      return {
        ...current,
        columns: current.columns.map((col: any) => ({
          ...col,
          cards: col.cards.map((c: any) =>
            c.id === card.id ? { ...c, agentId } : c
          ),
        })),
      };
    }, { revalidate: false });

    try {
      const res = await apiFetch(`/api/cards/${card.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId }),
      });
      if (!res.ok) throw new Error('Failed to assign agent');
      mutate(`/api/boards/${boardId}`);
    } catch (error) {
      console.error('Failed to assign agent:', error);
      // Revert on error
      mutate(`/api/boards/${boardId}`);
    } finally {
      setAssigning(false);
    }
  }, [boardId, card.id, assigning]);

  const handleSetBlocked = useCallback(async (blocked: string | null) => {
    if (!boardId) return;
    setBlockedDropdownOpen(false);

    // Optimistic update
    mutate(`/api/boards/${boardId}`, (current: any) => {
      if (!current) return current;
      return {
        ...current,
        columns: current.columns.map((col: any) => ({
          ...col,
          cards: col.cards.map((c: any) =>
            c.id === card.id ? { ...c, blocked } : c
          ),
        })),
      };
    }, { revalidate: false });

    try {
      const res = await apiFetch(`/api/cards/${card.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocked }),
      });
      if (!res.ok) throw new Error('Failed to update blocked status');
      mutate(`/api/boards/${boardId}`);
    } catch (error) {
      console.error('Failed to update blocked status:', error);
      mutate(`/api/boards/${boardId}`);
    }
  }, [boardId, card.id]);

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
          {/* Blocked badge — clickable dropdown */}
          <div className="relative" ref={blockedDropdownRef}>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setBlockedDropdownOpen(!blockedDropdownOpen);
                setAgentDropdownOpen(false);
              }}
              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                card.blocked
                  ? 'bg-red-100 text-red-800 hover:bg-red-200'
                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
              }`}
            >
              {card.blocked || '—'}
              <svg className="ml-0.5 h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {blockedDropdownOpen && (
              <div
                onPointerDown={(e) => e.stopPropagation()}
                className="absolute z-[100] top-full left-0 mt-1 w-28 bg-white rounded-md shadow-lg border border-gray-200 py-0.5"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSetBlocked(null);
                  }}
                  className={`w-full text-left px-2.5 py-1 text-[11px] hover:bg-gray-50 transition-colors ${
                    !card.blocked ? 'bg-gray-50 text-gray-800 font-medium' : 'text-gray-700'
                  }`}
                >
                  —
                  {!card.blocked && <span className="ml-1 text-gray-400">✓</span>}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSetBlocked('Blocked');
                  }}
                  className={`w-full text-left px-2.5 py-1 text-[11px] hover:bg-red-50 transition-colors ${
                    card.blocked === 'Blocked' ? 'bg-red-50 text-red-800 font-medium' : 'text-red-700'
                  }`}
                >
                  Blocked
                  {card.blocked === 'Blocked' && <span className="ml-1 text-red-500">✓</span>}
                </button>
              </div>
            )}
          </div>

          {/* Agent badge — clickable dropdown */}
          {agents && agents.length > 0 ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  setAgentDropdownOpen(!agentDropdownOpen);
                }}
                disabled={assigning}
                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                  agentName
                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                } ${assigning ? 'opacity-50' : ''}`}
              >
                {assigning ? '...' : (agentName || 'Unassigned')}
                <svg className="ml-0.5 h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {agentDropdownOpen && (
                <div
                  onPointerDown={(e) => e.stopPropagation()}
                  className="absolute z-[100] top-full left-0 mt-1 w-36 bg-white rounded-md shadow-lg border border-gray-200 py-0.5"
                >
                  {agents.map((agent) => (
                    <button
                      key={agent.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAssignAgent(agent.id);
                      }}
                      className={`w-full text-left px-2.5 py-1 text-[11px] hover:bg-indigo-50 transition-colors ${
                        card.agentId === agent.id ? 'bg-emerald-50 text-emerald-800 font-medium' : 'text-gray-700'
                      }`}
                    >
                      {agent.name}
                      {card.agentId === agent.id && (
                        <span className="ml-1 text-emerald-500">✓</span>
                      )}
                    </button>
                  ))}
                  {card.agentId && (
                    <>
                      <div className="border-t border-gray-100 my-0.5" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAssignAgent(null);
                        }}
                        className="w-full text-left px-2.5 py-1 text-[11px] text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        Unassign
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : agentName ? (
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
