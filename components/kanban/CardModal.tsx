'use client';

import { useState, useEffect } from 'react';
import type { Card, CreateCardRequest, UpdateCardRequest } from '@/types/card';
import { ActivityLog } from './ActivityLog';
import { CommentSection } from './CommentSection';
import { LinkifyText } from './LinkifyText';
import apiFetch from '@/lib/apiFetch';

interface AgentOption {
  id: string;
  name: string;
}

interface CardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (cardData: CreateCardRequest | UpdateCardRequest) => Promise<void>;
  onDelete?: (cardId: string) => Promise<void>;
  onArchive?: (cardId: string, archived: boolean) => Promise<void>;
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
  onArchive,
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
  const [blocked, setBlocked] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [descEditMode, setDescEditMode] = useState(false);

  const isEditMode = !!card;

  useEffect(() => {
    if (card) {
      setTitle(card.title);
      setDescription(card.description || '');
      setTags(card.tags || []);
      setAgentId(card.agentId && agents.some(a => a.id === card.agentId) ? card.agentId : '');
      setBlocked(card.blocked || '');
    } else {
      setTitle('');
      setDescription('');
      setTags([]);
      setTagInput('');
      setAgentId('');
      setBlocked('');
    }
    setError('');
    setIsSaving(false);
    setShowDeleteConfirm(false);
    setShowArchiveConfirm(false);
    setDescEditMode(!card); // Edit mode for new cards, view mode for existing
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
            blocked: blocked || null,
          }
        : ({
            title: title.trim(),
            description: description.trim() || undefined,
            columnId,
            boardId,
            tags,
            agentId: agentId || undefined,
            blocked: blocked || null,
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

  const handleArchive = async () => {
    if (!card || !onArchive) return;
    setIsArchiving(true);
    setError('');
    try {
      await onArchive(card.id, !(card.archived ?? false));
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to archive card';
      setError(errorMessage);
      setShowArchiveConfirm(false);
      setIsArchiving(false);
    }
  };

  const handleCopyLink = () => {
    if (!card) return;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    // Use assigned agent token, or fall back to any approved agent token on the board
    const token = (card.agentId && agentTokensMap?.[card.agentId])
      ? agentTokensMap[card.agentId]
      : Object.values(agentTokensMap || {})[0];
    const url = token
      ? `${appUrl}/card/${card.id}?token=${token}`
      : `${appUrl}/boards/${boardId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  const handleGenerateTitle = async () => {
    if (!description.trim() || description.trim().length < 10) {
      setError('Write at least 10 characters in the description first');
      return;
    }
    setIsGeneratingTitle(true);
    setError('');
    try {
      const res = await apiFetch('/api/ai/generate-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: description.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to generate title');
      }
      const { title: generatedTitle } = await res.json();
      setTitle(generatedTitle);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate title');
    } finally {
      setIsGeneratingTitle(false);
    }
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
                      {isEditMode && onArchive && !showArchiveConfirm && (
                        <button
                          type="button"
                          onClick={() => setShowArchiveConfirm(true)}
                          className="p-1.5 rounded-md text-gray-400 hover:text-amber-600 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors"
                          title="Archive card"
                        >
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
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
                      <div className="mt-1 flex gap-2">
                        <input
                          type="text"
                          id="card-title"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          placeholder="Card title"
                          autoFocus
                          required
                        />
                        <button
                          type="button"
                          onClick={handleGenerateTitle}
                          disabled={isGeneratingTitle || description.trim().length < 10}
                          className="flex-shrink-0 inline-flex items-center px-2.5 py-2 rounded-md border border-gray-300 text-gray-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          title="AI-generate title from description"
                        >
                          {isGeneratingTitle ? (
                            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          ) : (
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="card-description"
                          className="block text-sm font-medium text-gray-700"
                        >
                          Description <span className="text-red-500">*</span>
                        </label>
                        {isEditMode && (
                          <button
                            type="button"
                            onClick={() => setDescEditMode(!descEditMode)}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                          >
                            {descEditMode ? 'Preview' : 'Edit'}
                          </button>
                        )}
                      </div>
                      {descEditMode ? (
                        <textarea
                          id="card-description"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          rows={12}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          placeholder="Add a description..."
                          required
                        />
                      ) : (
                        <div
                          onClick={() => setDescEditMode(true)}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 sm:text-sm min-h-[12rem] cursor-pointer hover:border-indigo-400 transition-colors whitespace-pre-wrap"
                        >
                          {description.trim() ? (
                            <LinkifyText text={description} />
                          ) : (
                            <span className="text-gray-400">Click to add a description...</span>
                          )}
                        </div>
                      )}
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

                    {/* Blocked Status */}
                    <div>
                      <label
                        htmlFor="card-blocked"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Status
                      </label>
                      <select
                        id="card-blocked"
                        value={blocked}
                        onChange={(e) => setBlocked(e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base text-gray-900 border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                      >
                        <option value="">—</option>
                        <option value="Blocked">Blocked</option>
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
                    {isDeleting ? 'Deleting...' : (
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
              ) : showArchiveConfirm ? (
                <>
                  <span className="text-sm text-amber-700 self-center mr-auto">
                    {card?.archived ? 'Unarchive this card?' : 'Archive this card? It will be hidden from the board.'}
                  </span>
                  <button
                    type="button"
                    onClick={handleArchive}
                    disabled={isArchiving}
                    className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-amber-600 text-base font-medium text-white hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isArchiving ? 'Archiving...' : (
                      card?.archived ? 'Confirm Unarchive' : 'Confirm Archive'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowArchiveConfirm(false)}
                    disabled={isArchiving}
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
                    {isSaving ? 'Saving...' : isEditMode ? (
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
