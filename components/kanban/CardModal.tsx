'use client';

import { useState, useEffect } from 'react';
import type { Card, CreateCardRequest, UpdateCardRequest } from '@/types/card';
import type { User } from '@/types/user';
import type { AgentConfig } from '@/types/agent';

interface CardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (cardData: CreateCardRequest | UpdateCardRequest) => Promise<void>;
  card?: Card;
  columnId: string;
  boardId: string;
  users: User[];
  agents: AgentConfig[];
}

export function CardModal({
  isOpen,
  onClose,
  onSave,
  card,
  columnId,
  boardId,
  users,
  agents,
}: CardModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [agentId, setAgentId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const isEditMode = !!card;

  useEffect(() => {
    if (card) {
      setTitle(card.title);
      setDescription(card.description || '');
      setTags(card.tags || []);
      setAssigneeId(card.assigneeId || '');
      setAgentId(card.agentId || '');
    } else {
      setTitle('');
      setDescription('');
      setTags([]);
      setTagInput('');
      setAssigneeId('');
      setAgentId('');
    }
    setError('');
  }, [card, isOpen]);

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

    try {
      const cardData = isEditMode
        ? {
            title: title.trim(),
            description: description.trim() || undefined,
            tags,
            assigneeId: assigneeId || undefined,
            agentId: agentId || undefined,
          }
        : ({
            title: title.trim(),
            description: description.trim() || undefined,
            columnId,
            boardId,
            tags,
            assigneeId: assigneeId || undefined,
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
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
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    {isEditMode ? 'Edit Card' : 'Create Card'}
                  </h3>
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
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
                        Description
                      </label>
                      <textarea
                        id="card-description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="Add a description..."
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
                          className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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

                    {/* Assignee */}
                    <div>
                      <label
                        htmlFor="card-assignee"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Assignee
                      </label>
                      <select
                        id="card-assignee"
                        value={assigneeId}
                        onChange={(e) => setAssigneeId(e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                      >
                        <option value="">Unassigned</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.firebaseUid}
                          </option>
                        ))}
                      </select>
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
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                      >
                        <option value="">No Agent</option>
                        {agents.map((agent) => (
                          <option key={agent.id} value={agent.id}>
                            {agent.name}
                          </option>
                        ))}
                      </select>
                    </div>

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
              <button
                type="submit"
                disabled={isSaving || !title.trim()}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : isEditMode ? 'Update Card' : 'Create Card'}
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
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
