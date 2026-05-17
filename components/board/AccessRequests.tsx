'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useToast } from '@/components/toast/ToastProvider';
import { fetchWithRetry } from '@/lib/utils/retry';

interface AccessRequest {
  id: string;
  boardId: string;
  agentName: string;
  status: string;
  requestedAt: string;
  approvedAt: string | null;
}

interface AccessRequestsProps {
  boardId: string;
}

export default function AccessRequests({ boardId }: AccessRequestsProps) {
  const toast = useToast();
  const [showPanel, setShowPanel] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const { data: requests, mutate: mutateRequests } = useSWR<AccessRequest[]>(
    `/api/board-access/list?boardId=${boardId}`,
    (url: string) => fetchWithRetry(url).then(r => r.json()),
    { refreshInterval: 10000 }
  );

  const approvedCount = requests?.filter(r => r.status === 'approved').length || 0;

  const handleRevoke = async (accessId: string, agentName: string) => {
    setRevokingId(accessId);
    try {
      const res = await fetchWithRetry('/api/board-access/list', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessId }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.showToast(`${agentName} access revoked`, 'success');
      await mutateRequests();
    } catch {
      toast.showToast('Failed to revoke access', 'error');
    } finally {
      setRevokingId(null);
    }
  };

  if (!requests || requests.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
      >
        <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Agents
        {approvedCount > 0 && (
          <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-[10px] font-bold text-green-700">
            {approvedCount}
          </span>
        )}
      </button>

      {showPanel && (
        <div className="absolute right-0 top-full mt-2 w-72 max-h-80 overflow-y-auto bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-3 border-b border-gray-100">
            <h3 className="text-sm font-medium text-gray-900">Connected Agents</h3>
          </div>

          <div className="divide-y divide-gray-100">
            {requests.map((req) => (
              <div key={req.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{req.agentName}</p>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                      req.status === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : req.status === 'denied'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {req.status}
                  </span>
                </div>

                {req.status === 'approved' && (
                  <button
                    onClick={() => handleRevoke(req.id, req.agentName)}
                    disabled={revokingId === req.id}
                    className="mt-2 text-xs text-red-600 hover:text-red-800 disabled:opacity-50 transition-colors"
                  >
                    Revoke access
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
