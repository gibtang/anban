'use client';

import { useState } from 'react';
import { useToast } from '@/components/toast/ToastProvider';
import { Spinner } from '@/components/ui/Spinner';

export default function SharePanel() {
  const toast = useToast();
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/user/share', { method: 'POST' });
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
      const shareText = `Check out Anban, the AI native Kanban board at ${shareUrl}`;
      navigator.clipboard.writeText(shareText);
      setCopied(true);
      toast.showToast('Link copied!', 'success');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRevoke = async () => {
    try {
      const res = await fetch('/api/user/share', { method: 'DELETE' });
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
            <Spinner size="xs" className="mr-1.5" />
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
          {/* Header with title + close X */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900">Share All Boards</h3>
            <button
              onClick={() => setShowPanel(false)}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Send this link to an agent to request access to all your boards.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1.5 font-mono text-gray-900"
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
            className="mt-3 text-xs text-red-500 hover:text-red-700 transition-colors"
          >
            Revoke link
          </button>
        </div>
      )}
    </div>
  );
}
