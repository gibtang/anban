'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Spinner } from '@/components/ui/Spinner';

export default function ApprovePage() {
  const params = useParams();
  const accessId = params.id as string;

  const [agentName, setAgentName] = useState('');
  const [boardName, setBoardName] = useState('');
  const [status, setStatus] = useState<'loading' | 'pending' | 'approved' | 'denied' | 'expired' | 'error'>('loading');
  const [isActing, setIsActing] = useState(false);
  const [error, setError] = useState('');

  // Fetch request details on mount
  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await fetch(`/api/board-access/details?id=${accessId}`);
        if (!res.ok) {
          setStatus('error');
          return;
        }
        const data = await res.json();
        setAgentName(data.agentName);
        setBoardName(data.boardName);

        if (data.status === 'approved' || data.status === 'denied') {
          setStatus(data.status);
        } else if (data.status === 'expired') {
          setStatus('expired');
        } else {
          setStatus('pending');
        }
      } catch {
        setStatus('error');
      }
    };

    if (accessId) fetchDetails();
  }, [accessId]);

  const handleAction = async (action: 'approve' | 'deny') => {
    setIsActing(true);
    setError('');

    try {
      const res = await fetch(`/api/board-access/${accessId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();

      if (res.status === 410 || data.error === 'expired') {
        setStatus('expired');
        return;
      }

      if (!res.ok) {
        setError(data.error || data.message || 'Failed to process');
        return;
      }

      setStatus(action === 'approve' ? 'approved' : 'denied');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsActing(false);
    }
  };

  // Loading
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner size="lg" className="text-indigo-600" />
      </div>
    );
  }

  // Approved
  if (status === 'approved') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-sm w-full text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Access Approved</h1>
          <p className="text-gray-500">{agentName} can now access your board.</p>
        </div>
      </div>
    );
  }

  // Denied
  if (status === 'denied') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-sm w-full text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-500">The request from {agentName} has been denied.</p>
        </div>
      </div>
    );
  }

  // Expired
  if (status === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-sm w-full text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Link Expired</h1>
          <p className="text-gray-500 mb-4">
            This approval link expired after 3 minutes.
          </p>
          <p className="text-sm text-gray-600">
            Ask {agentName || 'the agent'} to send a new link.
          </p>
        </div>
      </div>
    );
  }

  // Error
  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-sm w-full text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Invalid Link</h1>
          <p className="text-gray-500">This approval link is invalid or has been revoked.</p>
        </div>
      </div>
    );
  }

  // Pending — show approve/deny
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-sm w-full">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center mb-6">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-indigo-100 flex items-center justify-center">
              <svg className="w-7 h-7 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-gray-900">Agent Access Request</h1>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Agent</span>
                <span className="text-sm font-medium text-gray-900">{agentName || 'Unknown'}</span>
              </div>
              {boardName && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Board</span>
                  <span className="text-sm font-medium text-gray-900">{boardName}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Expires</span>
                <span className="text-sm text-yellow-700 font-medium">in 3 minutes</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-3 mb-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => handleAction('deny')}
              disabled={isActing}
              className="flex-1 py-2.5 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {isActing ? (
                <>
                  <Spinner size="xs" className="mr-1.5" />
                  Denying...
                </>
              ) : (
                'Deny'
              )}
            </button>
            <button
              onClick={() => handleAction('approve')}
              disabled={isActing}
              className="flex-1 py-2.5 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {isActing ? (
                <>
                  <Spinner size="xs" className="mr-1.5" />
                  Approving...
                </>
              ) : (
                'Approve'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
