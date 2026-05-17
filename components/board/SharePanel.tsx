'use client';

import { useState } from 'react';
import { useToast } from '@/components/toast/ToastProvider';

interface SharePanelProps {
  boardId: string;
}

export default function SharePanel({ boardId }: SharePanelProps) {
  const toast = useToast();
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/boards/${boardId}/share`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to generate share link');
      const data = await res.json();
      setShareUrl(data.shareUrl);
      setShowPanel(true);
    } catch {
      toast.showToast('Failed to generate share link', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.showToast('Link copied!', 'success');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRevoke = async () => {
    try {
      const res = await fetch(`/api/boards/${boardId}/share`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to revoke');
      setShareUrl(null);
      setShowPanel(false);
      toast.showToast('Share link revoked', 'success');
    } catch {
      toast.showToast('Failed to revoke share link', 'error');
    }
  };

  return (
    <div className="relative">
      <button
        onClick={shareUrl ? () => setShowPanel(!showPanel) : handleShare}
        disabled={isLoading}
        className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2" />
            Generating...
          </>
        ) : (
          <>
            <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share
          </>
        )}
      </button>

      {showPanel && shareUrl && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Share Board</h3>
          <p className="text-xs text-gray-500 mb-3">
            Send this link to an agent to request access to your board.
          </p>
          <div className="flex items-center gap-2 mb-3">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1.5 font-mono text-gray-700"
            />
            <button
              onClick={handleCopy}
              className="px-2.5 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
            >
              {copied ? '✓' : 'Copy'}
            </button>
          </div>
          <button
            onClick={handleRevoke}
            className="text-xs text-red-600 hover:text-red-800 transition-colors"
          >
            Revoke link
          </button>
        </div>
      )}
    </div>
  );
}
