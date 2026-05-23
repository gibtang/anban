'use client';

import { useState, useEffect } from 'react';
import type { Card, CreateCardRequest, UpdateCardRequest } from '@/types/card';
import { Spinner } from '@/components/ui/Spinner';
import { ActivityLog } from './ActivityLog';
import { CommentSection } from './CommentSection';

interface AgentOption {
  id: string;
  name: string;
}

interface CardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (cardData: CreateCardRequest | UpdateCardRequest) => Promise<void>;
  onDelete?: (cardId: string) => Promise<void>;
  card?: Card;
  columnId: string;
  boardId: string;
  agents: AgentOption[];
  agentTokensMap?: Record<string, string>;
}

export function CardModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  card,
  columnId,
  boardId,
  agents,
  agentTokensMap,
}: CardModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [agentId, setAgentId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const isEditMode = !!card;

  useEffect(() => {
    if (card) {
      setTitle(card.title);
      setDescription(card.description || '');
      setTags(card.tags || []);
      setAgentId(card.agentId && agents.some(a => a.id === card.agentId) ? card.agentId : '');
    } else {
      setTitle('');
      setDescription('');
      setTags([]);
      setTagInput('');
      setAgentId('');
    }
    setError('');
    setIsSaving(false);
    setShowDeleteConfirm(false);
  }, [card, isOpen, agents]);

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');

    if (!title.trim()) {
      setError('Title is required');
      setIsSaving(false);
      return;
    }

    if (!description.trim()) {
      setError('Description is required');
      setIsSaving(false);
      return;
    }

    try {
      const cardData = isEditMode
        ? {
            title: title.trim(),
            description: description.trim() || undefined,
            tags,
            agentId: agentId || undefined,
          }
        : ({
            title: title.trim(),
            description: description.trim() || undefined,
            columnId,
            boardId,
            tags,
            agentId: agentId || undefined,
          } as CreateCardRequest);

      await onSave(cardData);
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save card';
      setError(errorMessage);
      // Keep modal open on error
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!card || !onDelete) return;
    setIsDeleting(true);
    setError('');
    try {
      await onDelete(card.id);
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete card';
      setError(errorMessage);
      setShowDeleteConfirm(false);
      setIsDeleting(false);
    }
  };

  const handleCopyLink = () => {
    if (!card) return;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    let url: string;
    // Board-level access: use assigned agent token, or any agent on the board
    const token = (card.agentId && agentTokensMap?.[card.agentId])
      ? agentTokensMap[card.agentId]
      : Object.values(agentTokensMap || {})[0];
    if (!token) return; // no agents on board, can't generate link
    url = `${appUrl}/card/${card.id}?token=${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-[10vh] px-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 bg-black/30 transition-opacity"
          onClick={onClose}
        />
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
        <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-[80%] sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full" style={{ zIndex: 1 }}>
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 sm:mx-0 sm:h-10 sm:w-10">
                  <svg
                    className="h-6 w-6 text-indigo-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      {isEditMode ? 'Edit Card' : 'Create Card'}
                    </h3>
                    <div className="flex items-center gap-1">
                      {/* Copy card URL button — always visible in edit mode */}
                      {isEditMode && (
                        <button
                          type="button"
                          onClick={handleCopyLink}
                          className="p-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"
                          title={copiedLink ? 'Copied!' : 'Copy card URL'}
                        >
                          {copiedLink ? (
                            <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                          )}
                        </button>
                      )}
                      {isEditMode && onDelete && !showDeleteConfirm && (
                        <button
                          type="button"
                          onClick={() => setShowDeleteConfirm(true)}
                          className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                          title="Delete card"
                        >
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 space-y-4">
                    {/* Title */}
                    <div>
                      <label
                        htmlFor="card-title"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="card-title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="Card title"
                        autoFocus
                        required
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label
                        htmlFor="card-description"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Description <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        id="card-description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={12}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="Add a description..."
                        required
                      />
                    </div>

                    {/* Tags */}
                    <div>
                      <label
                        htmlFor="card-tags"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Tags
                      </label>
                      <div className="mt-1 flex rounded-md shadow-sm">
                        <input
                          type="text"
                          id="card-tags"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={handleTagInputKeyDown}
                          className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md border border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          placeholder="Add tag and press Enter"
                        />
                        <button
                          type="button"
                          onClick={handleAddTag}
                          className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-600 text-sm hover:bg-gray-100"
                        >
                          Add
                        </button>
                      </div>
                      {tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                            >
                              {tag}
                              <button
                                type="button"
                                onClick={() => handleRemoveTag(tag)}
                                className="ml-1 inline-flex items-center justify-center w-4 h-4 text-indigo-600 hover:text-indigo-800 focus:outline-none"
                              >
                                <svg
                                  className="w-3 h-3"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                  />
                                </svg>
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Agent */}
                    <div>
                      <label
                        htmlFor="card-agent"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Agent
                      </label>
                      <select
                        id="card-agent"
                        value={agentId}
                        onChange={(e) => setAgentId(e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base text-gray-900 border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                      >
                        <option value="">No Agent</option>
                        {agents.map((agent) => (
                          <option key={agent.id} value={agent.id}>
                            {agent.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Comments — only in edit mode */}
                    {isEditMode && card && (
                      <CommentSection cardId={card.id} />
                    )}

                    {/* Activity Log — only in edit mode */}
                    {isEditMode && card && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Activity
                        </label>
                        <div className="border border-gray-200 rounded-md p-3 max-h-48 overflow-y-auto bg-gray-50/50">
                          <ActivityLog cardId={card.id} />
                        </div>
                      </div>
                    )}

                    {error && (
                      <div className="rounded-md bg-red-50 p-4">
                        <p className="text-sm text-red-800">{error}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              {showDeleteConfirm ? (
                <>
                  <span className="text-sm text-red-700 self-center mr-auto">
                    Delete this card permanently?
                  </span>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDeleting ? (
                      <>
                        <Spinner size="sm" className="mr-2 text-white" />
                        Deleting...
                      </>
                    ) : (
                      'Confirm Delete'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="submit"
                    disabled={isSaving || !title.trim()}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? (
                      <>
                        <Spinner size="sm" className="mr-2 text-white" />
                        Saving...
                      </>
                    ) : isEditMode ? (
                      'Update Card'
                    ) : (
                      'Create Card'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      setError('');
                    }}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
