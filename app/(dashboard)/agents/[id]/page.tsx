'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fetchWithRetry } from '@/lib/utils/retry';

interface AgentCard {
  id: string;
  title: string;
  description: string | null;
  tags: string[];
  position: number;
  boardId: string;
  boardName: string;
  boardArchived: boolean;
  columnId: string;
  columnName: string;
  createdAt: string;
  updatedAt: string;
}

interface AgentCardsResponse {
  agent: { id: string; name: string };
  cards: AgentCard[];
}

const fetcher = async (url: string) => {
  const res = await fetchWithRetry(url);
  return res.json();
};

export default function AgentCardsPage() {
  const params = useParams();
  const agentId = params.id as string;

  const { data, error, isLoading } = useSWR<AgentCardsResponse>(
    `/api/agents/${agentId}/cards`,
    fetcher
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const diffMs = Date.now() - date.getTime();
    if (diffMs < 0) return 'Just now';
    const mins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMs / 3600000);
    const days = Math.floor(diffMs / 86400000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  // Group cards by board
  const cardsByBoard = data?.cards.reduce((acc, card) => {
    const key = card.boardId;
    if (!acc[key]) {
      acc[key] = { name: card.boardName, archived: card.boardArchived, cards: [] };
    }
    acc[key].cards.push(card);
    return acc;
  }, {} as Record<string, { name: string; archived: boolean; cards: AgentCard[] }>) || {};

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Link href="/agents" className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="h-7 w-40 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Link href="/agents" className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Agent Cards</h1>
        </div>
        <div className="rounded-lg bg-red-50 border border-red-200 p-6 text-center">
          <p className="text-sm text-red-700">Failed to load agent cards. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/agents" className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{data?.agent.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {data?.cards.length || 0} assigned {data?.cards.length === 1 ? 'card' : 'cards'}
          </p>
        </div>
      </div>

      {/* Cards grouped by board */}
      {Object.keys(cardsByBoard).length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
            <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-sm text-gray-500">No cards assigned to this agent yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(cardsByBoard).map(([boardId, board]) => (
            <div key={boardId}>
              <div className="flex items-center gap-2 mb-3">
                <Link
                  href={`/boards/${boardId}`}
                  className="text-sm font-semibold text-gray-700 hover:text-indigo-600 transition-colors"
                >
                  {board.name}
                </Link>
                {board.archived && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                    Archived
                  </span>
                )}
                <span className="text-xs text-gray-400">
                  {board.cards.length} {board.cards.length === 1 ? 'card' : 'cards'}
                </span>
              </div>
              <div className="space-y-2">
                {board.cards.map((card) => (
                  <Link
                    key={card.id}
                    href={`/boards/${boardId}`}
                    className="block bg-white rounded-lg border border-gray-200 p-4 hover:border-indigo-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate">{card.title}</h3>
                        {card.description && (
                          <p className="mt-1 text-xs text-gray-500 line-clamp-2">{card.description}</p>
                        )}
                        <div className="mt-2 flex items-center gap-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                            {card.columnName}
                          </span>
                          {card.tags.length > 0 && (
                            <div className="flex items-center gap-1">
                              {card.tags.slice(0, 3).map((tag) => (
                                <span key={tag} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-indigo-50 text-indigo-700">
                                  {tag}
                                </span>
                              ))}
                              {card.tags.length > 3 && (
                                <span className="text-xs text-gray-400">+{card.tags.length - 3}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {formatDate(card.updatedAt)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
