'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/toast/ToastProvider';
import { fetchWithRetry } from '@/lib/utils/retry';

interface BoardAccess {
  id: string;
  boardId: string;
  agentName: string;
  agentToken: string | null;
  status: 'pending' | 'approved' | 'denied';
  requestedAt: string;
  approvedAt: string | null;
}

interface Board {
  id: string;
  name: string;
}

const fetcher = async (url: string) => {
  try {
    const res = await fetchWithRetry(url);
    return res.json();
  } catch (error) {
    console.error('Failed to fetch:', error);
    throw error;
  }
};

export default function AgentsPage() {
  const toast = useToast();
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [copyingTokenId, setCopyingTokenId] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<{ id: string; name: string; boardName: string } | null>(null);

  // Fetch user's boards
  const { data: boards, error: boardsError } = useSWR<Board[]>('/api/boards', fetcher);

  // Fetch access requests for each board
  const boardRequests = useSWR(
    boards && boards.length > 0 ? boards.map(b => `/api/board-access/list?boardId=${b.id}`) : null,
    async (urls: string[]) => {
      const results = await Promise.all(
        urls.map(async (url) => {
          const res = await fetchWithRetry(url);
          return res.json();
        })
      );
      // Flatten and attach board name
      return results.flatMap((requests: BoardAccess[], i: number) =>
        requests.map((r: BoardAccess) => ({
          ...r,
          boardName: boards?.[i]?.name || 'Unknown',
        }))
      );
    }
  );

  const agents = boardRequests.data || [];
  const approved = agents.filter((a: BoardAccess & { boardName: string }) => a.status === 'approved');
  const pending = agents.filter((a: BoardAccess & { boardName: string }) => a.status === 'pending');
  const isLoading = !boards || (!boardRequests.data && !boardRequests.error);

  const handleRevoke = async (accessId: string, agentName: string) => {
    setRevokingId(accessId);
    setConfirmRevoke(null);
    try {
      const res = await fetchWithRetry('/api/board-access/list', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessId }),
      });
      if (!res.ok) throw new Error('Failed to revoke');
      await mutate(boards?.map(b => `/api/board-access/list?boardId=${b.id}`) || null);
      toast.showToast(`Revoked access for ${agentName}`, 'success');
    } catch {
      toast.showToast('Failed to revoke access', 'error');
    } finally {
      setRevokingId(null);
    }
  };

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

  // Loading
  if (isLoading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Agents</h1>
            <p className="mt-1 text-sm text-gray-500">Loading...</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" className="text-indigo-600" />
        </div>
      </div>
    );
  }

  // Error
  if (boardsError || boardRequests.error) {
    return (
      <div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Agents</h1>
          </div>
        </div>
        <div className="rounded-lg bg-red-50 border border-red-200 p-6 text-center">
          <p className="text-sm text-red-700">Failed to load agents. Please try again.</p>
        </div>
      </div>
    );
  }

  // No boards yet
  if (!boards || boards.length === 0) {
    return (
      <div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Agents</h1>
          </div>
        </div>
        <div className="text-center py-16">
          <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">No boards yet</h3>
          <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
            Create a board and share it with your AI agents. They&apos;ll appear here once approved.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Agents</h1>
        <p className="mt-1 text-sm text-gray-500">
          AI agents that have access to your boards via share links
        </p>
      </div>

      {/* How it works */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-1">How agents connect</h3>
        <p className="text-xs text-blue-700">
          Share a board link (e.g. <code className="bg-blue-100 px-1 rounded">/join/&lt;token&gt;</code>) with your AI agent. 
          They request access, you approve, and they get an API token to read and modify cards on your board.
        </p>
      </div>

      {/* Pending requests */}
      {pending.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Pending Requests ({pending.length})
          </h2>
          <div className="bg-white rounded-lg border border-yellow-200 overflow-hidden">
            <ul className="divide-y divide-gray-100">
              {pending.map((agent: BoardAccess & { boardName: string }) => (
                <li key={agent.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{agent.agentName}</p>
                    <p className="text-xs text-gray-500">
                      {agent.boardName} · requested {formatDate(agent.requestedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                      Awaiting approval
                    </span>
                    <button
                      onClick={() => setConfirmRevoke({ id: agent.id, name: agent.agentName, boardName: agent.boardName })}
                      disabled={revokingId === agent.id}
                      className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {revokingId === agent.id ? (
                        <>
                          <Spinner size="xs" className="mr-1 text-red-600" />
                          Revoking...
                        </>
                      ) : (
                        'Revoke'
                      )}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Approved agents */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          Active Agents ({approved.length})
        </h2>
        {approved.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">No agents have been approved yet.</p>
            <p className="text-xs text-gray-400 mt-1">Share a board link with an AI agent to get started.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <ul className="divide-y divide-gray-100">
              {approved.map((agent: BoardAccess & { boardName: string }) => (
                <li key={agent.id} className="px-4 py-3 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-indigo-600">
                          {agent.agentName[0]?.toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{agent.agentName}</p>
                        <p className="text-xs text-gray-500">
                          {agent.boardName} · approved {agent.approvedAt ? formatDate(agent.approvedAt) : 'recently'}
                        </p>
                        {agent.agentToken && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <code className="text-[11px] font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                              {agent.agentToken.slice(0, 5)}{'*'.repeat(Math.min(agent.agentToken.length - 5, 20))}
                            </code>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(agent.agentToken!);
                                setCopyingTokenId(agent.id);
                                setTimeout(() => setCopyingTokenId(null), 2000);
                              }}
                              className="text-gray-400 hover:text-gray-600 transition-colors"
                              title="Copy token"
                            >
                              {copyingTokenId === agent.id ? (
                                <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setConfirmRevoke({ id: agent.id, name: agent.agentName, boardName: agent.boardName })}
                    disabled={revokingId === agent.id}
                    className="ml-3 inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {revokingId === agent.id ? (
                      <>
                        <Spinner size="xs" className="mr-1 text-red-600" />
                        Revoking...
                      </>
                    ) : (
                      'Revoke'
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Confirmation modal */}
      {confirmRevoke && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-black/50 transition-opacity"
              onClick={() => setConfirmRevoke(null)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Revoke Access</h3>
                  <p className="text-sm text-gray-500">This action cannot be undone.</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 mb-5">
                <p className="text-sm text-gray-700">
                  Remove <strong>{confirmRevoke.name}</strong>&apos;s access to <strong>{confirmRevoke.boardName}</strong>?
                  They will need to request access again via the share link.
                </p>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setConfirmRevoke(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRevoke(confirmRevoke.id, confirmRevoke.name)}
                  disabled={revokingId === confirmRevoke.id}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {revokingId === confirmRevoke.id ? (
                    <>
                      <Spinner size="xs" className="mr-2 text-white" />
                      Revoking...
                    </>
                  ) : (
                    'Revoke Access'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
