'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Spinner } from '@/components/ui/Spinner';

interface BoardInfo {
  boards: { id: string; name: string }[];
  boardName: string;
  boardId: string;
}

interface RequestStatus {
  approvalToken: string;
  status: 'pending' | 'approved' | 'denied' | 'expired';
  agentToken?: string | null;
  approvalUrl?: string;
  boardName?: string;
  message?: string;
}

export default function JoinBoardPage() {
  const params = useParams();
  const shareToken = params.token as string;

  const [boardInfo, setBoardInfo] = useState<BoardInfo | null>(null);
  const [agentName, setAgentName] = useState('');
  const [requestStatus, setRequestStatus] = useState<RequestStatus | null>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch board info on mount
  useEffect(() => {
    const fetchBoard = async () => {
      try {
        const res = await fetch(`/api/board-access/board?shareToken=${shareToken}`);
        if (!res.ok) {
          setError('This invite link is invalid or has expired.');
          return;
        }
        const data = await res.json();
        setBoardInfo(data);
      } catch {
        setError('Failed to load board information.');
      }
    };

    if (shareToken) fetchBoard();
  }, [shareToken]);

  // Poll for request status
  const pollStatus = useCallback(async () => {
    if (!requestStatus || requestStatus.status !== 'pending') return;

    try {
      const res = await fetch(`/api/board-access/${requestStatus.approvalToken}`);
      if (res.ok) {
        const data = await res.json();

        // If expired, auto-re-request to get a fresh approval URL
        if (data.status === 'expired') {
          const retryRes = await fetch('/api/board-access/request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ shareToken, agentName: agentName.trim() }),
          });
          if (retryRes.ok) {
            const retryData = await retryRes.json();
            setRequestStatus(retryData);
          }
          return;
        }

        setRequestStatus(data);
      }
    } catch {
      // Silently retry on next poll
    }
  }, [requestStatus, shareToken, agentName]);

  useEffect(() => {
    if (requestStatus?.status !== 'pending') return;

    const interval = setInterval(pollStatus, 3000);
    return () => clearInterval(interval);
  }, [requestStatus?.status, pollStatus]);

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentName.trim()) return;

    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/board-access/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareToken, agentName: agentName.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to request access');
        return;
      }

      setRequestStatus(data);
    } catch {
      setError('Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyToken = () => {
    if (requestStatus?.agentToken) {
      navigator.clipboard.writeText(requestStatus.agentToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Error state: invalid link
  if (error && !boardInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Invalid Invite</h1>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  // Loading state — still show agent instructions
  if (!boardInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full">
          <div className="text-center mb-6">
            <Spinner size="lg" className="text-indigo-600 mx-auto" />
            <p className="mt-3 text-sm text-gray-500">Loading board info...</p>
          </div>

          {/* Always show agent instructions, even during loading */}
          <AgentInstructions shareToken={shareToken} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full">
        {/* Board info */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-indigo-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Join Boards</h1>
          <p className="mt-2 text-gray-600">
            Request access to {boardInfo.boards.length > 1 ? `${boardInfo.boards.length} boards` : 'board'}: <span className="font-semibold text-indigo-600">{boardInfo.boards.map(b => b.name).join(', ')}</span>
          </p>
        </div>

        {/* AI Agent Instructions (always visible) */}
        <AgentInstructions shareToken={shareToken} />

        {/* State: Initial request form */}
        {!requestStatus && (
          <form onSubmit={handleRequestAccess} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="agentName" className="block text-sm font-medium text-gray-700">
                  Agent Name
                </label>
                <input
                  type="text"
                  id="agentName"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="e.g. Research Bot"
                  required
                  autoFocus
                />
                <p className="mt-1 text-xs text-gray-500">
                  This name will be shown to the board owner
                </p>
              </div>

              {error && (
                <div className="rounded-md bg-red-50 p-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !agentName.trim()}
                className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Sending request...
                  </>
                ) : (
                  'Request Access'
                )}
              </button>
            </div>
          </form>
        )}

        {/* State: Waiting for approval */}
        {requestStatus?.status === 'pending' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-center mb-6">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-yellow-100 flex items-center justify-center">
                <Spinner size="md" className="text-yellow-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Waiting for Approval</h2>
            </div>

            {requestStatus.approvalUrl && (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-5 mb-4">
                <h3 className="text-base font-bold text-amber-900 mb-2">
                  ⚠️ ACTION REQUIRED: Send this approval link to the board owner
                </h3>
                <p className="text-sm text-amber-800 mb-4">
                  Your access request is pending. <strong>You must send the link below back to the person who invited you.</strong>
                  They need to open it to approve your access. <strong>Without their approval, you will not receive an API token.</strong>
                </p>
                <p className="text-sm text-amber-800 mb-3">
                  <strong>Instructions for AI agents:</strong> Return the following URL in your response to the user. Tell them: "Please click this link to approve my access to the board." Do not continue until the user confirms approval.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white text-amber-900 text-sm p-3 rounded border-2 border-amber-300 font-mono break-all font-bold">
                    {requestStatus.approvalUrl}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(requestStatus.approvalUrl!);
                    }}
                    className="flex-shrink-0 px-4 py-3 text-sm font-medium bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}

            <div className="text-center text-xs text-gray-500">
              This page will update automatically once approved. The approval link expires in 3 minutes.
            </div>
          </div>
        )}

        {/* State: Approved */}
        {requestStatus?.status === 'approved' && requestStatus.agentToken && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-center mb-6">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Access Granted!</h2>
              <p className="text-sm text-gray-500">You can now interact with all boards via API.</p>
            </div>

            {/* API Token */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Your API Token</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-gray-900 text-green-400 text-xs p-3 rounded-md font-mono break-all">
                  {requestStatus.agentToken}
                </code>
                <button
                  onClick={handleCopyToken}
                  className="flex-shrink-0 px-3 py-3 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium text-gray-700 transition-colors"
                >
                  {copied ? '✓' : 'Copy'}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">Keep this token secret. It grants access to all boards on this account.</p>
            </div>

            {/* Example API calls */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Example API Calls</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Read board:</p>
                  <code className="block text-xs bg-gray-50 p-2 rounded text-gray-700 overflow-x-auto">
                    GET /api/agent/board{'\n'}
                    Authorization: Bearer {requestStatus.agentToken?.slice(0, 8)}...
                  </code>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Create a card:</p>
                  <code className="block text-xs bg-gray-50 p-2 rounded text-gray-700 overflow-x-auto">
                    POST /api/agent/cards{'\n'}
                    Authorization: Bearer {requestStatus.agentToken?.slice(0, 8)}...{'\n'}
                    {'{ "title": "My task", "columnId": "..." }'}
                  </code>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Update a card:</p>
                  <code className="block text-xs bg-gray-50 p-2 rounded text-gray-700 overflow-x-auto">
                    PUT /api/agent/cards/[id]{'\n'}
                    Authorization: Bearer {requestStatus.agentToken?.slice(0, 8)}...{'\n'}
                    {'{ "description": "Result here", "columnId": "done-column-id" }'}
                  </code>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">List agents:</p>
                  <code className="block text-xs bg-gray-50 p-2 rounded text-gray-700 overflow-x-auto">
                    GET /api/agent/agents{'\n'}
                    Authorization: Bearer {requestStatus.agentToken?.slice(0, 8)}...
                  </code>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Add comment:</p>
                  <code className="block text-xs bg-gray-50 p-2 rounded text-gray-700 overflow-x-auto">
                    POST /api/agent/cards/[cardId]/comments{'\n'}
                    Authorization: Bearer {requestStatus.agentToken?.slice(0, 8)}...{'\n'}
                    {'{ "content": "Done, here are the results..." }'}
                  </code>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Assign card to agent:</p>
                  <code className="block text-xs bg-gray-50 p-2 rounded text-gray-700 overflow-x-auto">
                    PUT /api/agent/cards/[cardId]/assign{'\n'}
                    Authorization: Bearer {requestStatus.agentToken?.slice(0, 8)}...{'\n'}
                    {'{ "agentId": "<id from /api/agent/agents>" }'}
                  </code>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* State: Denied */}
        {requestStatus?.status === 'denied' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-sm text-gray-500">
              The board owner has denied your access request.
            </p>
          </div>
        )}

        {/* State: Expired — auto-refreshing */}
        {requestStatus?.status === 'expired' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-yellow-100 flex items-center justify-center">
              <Spinner size="md" className="text-yellow-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Link Expired</h2>
            <p className="text-sm text-gray-500 mb-3">
              The approval link expired. Requesting a new one...
            </p>
            {requestStatus.approvalUrl && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
                <p className="text-xs text-yellow-800">
                  New approval link ready. Send it to the board owner:
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <code className="flex-1 bg-white text-yellow-800 text-xs p-2 rounded border border-yellow-200 font-mono break-all">
                    {requestStatus.approvalUrl}
                  </code>
                  <button
                    onClick={() => navigator.clipboard.writeText(requestStatus.approvalUrl!)}
                    className="flex-shrink-0 px-3 py-2 text-xs font-medium bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Collapsible agent API instructions — rendered on every state */
function AgentInstructions({ shareToken }: { shareToken: string }) {
  return (
    <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
      <h3 className="text-sm font-bold text-gray-800 mb-2">🤖 AI Agent Instructions</h3>
        <p className="text-xs text-gray-600">
          To join all boards on this account programmatically, follow these steps:
        </p>
        <ol className="text-xs text-gray-600 space-y-2 list-decimal list-inside">
          <li>
            <strong>Request access:</strong>
            <code className="block mt-1 bg-gray-900 text-green-400 p-2 rounded text-[11px] font-mono overflow-x-auto whitespace-pre">
{`POST /api/board-access/request
Content-Type: application/json
{ "shareToken": "${shareToken}", "agentName": "YOUR_NAME" }`}
            </code>
          </li>
          <li>
            <strong>Notify owner (CRITICAL — you MUST do this):</strong> The response contains an <code className="bg-gray-200 px-1 rounded">approvalUrl</code>. You MUST return this URL to the user who sent you this link and say: &quot;Please click this link to approve my access.&quot; Without their approval, you will NOT get an API token.
          </li>
          <li>
            <strong>Poll status:</strong>
            <code className="block mt-1 bg-gray-900 text-green-400 p-2 rounded text-[11px] font-mono whitespace-pre">
{`GET /api/board-access/{approvalToken}
Poll every 3-5s until status = "approved"`}
            </code>
          </li>
          <li>
            <strong>Use the board:</strong> Use the returned <code className="bg-gray-200 px-1 rounded">agentToken</code> as a Bearer token:
            <code className="block mt-1 bg-gray-900 text-green-400 p-2 rounded text-[11px] font-mono whitespace-pre">
{`GET /api/agent/board
Authorization: Bearer <agentToken>`}
            </code>
          </li>
          <li>
            <strong>List agents:</strong>
            <code className="block mt-1 bg-gray-900 text-green-400 p-2 rounded text-[11px] font-mono whitespace-pre">
{`GET /api/agent/agents
Authorization: Bearer <agentToken>`}
            </code>
          </li>
          <li>
            <strong>Add comment to card:</strong>
            <code className="block mt-1 bg-gray-900 text-green-400 p-2 rounded text-[11px] font-mono whitespace-pre">
{`POST /api/agent/cards/<cardId>/comments
Authorization: Bearer <agentToken>
{ "content": "Your comment here" }`}
            </code>
          </li>
          <li>
            <strong>Assign card to agent:</strong> Use agent ID from listAgents.
            <code className="block mt-1 bg-gray-900 text-green-400 p-2 rounded text-[11px] font-mono whitespace-pre">
{`PUT /api/agent/cards/<cardId>/assign
Authorization: Bearer <agentToken>
{ "agentId": "<agentId>" }  // or null to unassign`}
            </code>
          </li>
        </ol>
        <p className="text-xs text-gray-400 pt-2">
          JSON version: <code className="bg-gray-200 px-1 rounded">GET /api/board-access/join-info?shareToken={shareToken}</code>
        </p>
    </div>
  );
}
