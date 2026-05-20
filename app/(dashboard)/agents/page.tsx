'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { AgentListSkeleton } from '@/components/skeletons/AgentSkeleton';
import { EmptyAgents } from '@/components/empty/EmptyAgents';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/toast/ToastProvider';
import { fetchWithRetry } from '@/lib/utils/retry';

interface AgentConfig {
  id: string;
  name: string;
  openClawId: string;
  description: string | null;
  model: string | null;
  enabled: boolean;
}

interface AgentHealthStatus {
  [agentId: string]: boolean;
}

const fetcher = async (url: string) => {
  try {
    const res = await fetchWithRetry(url);
    return res.json();
  } catch (error) {
    console.error('Failed to fetch agents:', error);
    throw error;
  }
};

export default function AgentsPage() {
  const toast = useToast();
  const { data: agents, error, isLoading, mutate: mutateAgents } = useSWR<AgentConfig[]>('/api/agents', fetcher, {
    onError: (error) => {
      console.error('Error loading agents:', error);
      toast.showToast('Failed to load agents. Please try again.', 'error');
    },
  });
  const [healthStatus, setHealthStatus] = useState<AgentHealthStatus>({});
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    openClawId: '',
    description: '',
    model: '',
  });
  const [testingAgentId, setTestingAgentId] = useState<string | null>(null);
  const [deletingAgentId, setDeletingAgentId] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetchWithRetry('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to create agent');
      }

      setFormData({ name: '', openClawId: '', description: '', model: '' });
      setShowForm(false);
      await mutateAgents();
      toast.showToast('Agent created successfully!', 'success');
    } catch (error) {
      console.error('Error creating agent:', error);
      toast.showToast('Failed to create agent. Please try again.', 'error');
    }
  };

  const handleTestConnection = async (agentId: string, agentName: string) => {
    setTestingAgentId(agentId);
    try {
      const response = await fetchWithRetry(`/api/agents/${agentId}/health`, {
        method: 'POST',
      });

      const data = await response.json();
      setHealthStatus((prev) => ({ ...prev, [agentId]: data.healthy }));

      if (data.healthy) {
        toast.showToast(`${agentName} is online and responding`, 'success');
      } else {
        toast.showToast(`${agentName} is not responding`, 'error');
      }
    } catch (error) {
      console.error('Health check failed:', error);
      setHealthStatus((prev) => ({ ...prev, [agentId]: false }));
      toast.showToast(`${agentName} connection failed - agent may be offline`, 'error');
    } finally {
      setTestingAgentId(null);
    }
  };

  const handleDelete = async (agentId: string, agentName: string) => {
    if (!confirm(`Are you sure you want to delete ${agentName}?`)) {
      return;
    }

    setDeletingAgentId(agentId);
    try {
      const response = await fetchWithRetry(`/api/agents/${agentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete agent');
      }

      setHealthStatus((prev) => {
        const newStatus = { ...prev };
        delete newStatus[agentId];
        return newStatus;
      });
      await mutateAgents();
      toast.showToast(`${agentName} deleted successfully`, 'success');
    } catch (error) {
      console.error('Error deleting agent:', error);
      toast.showToast('Failed to delete agent. Please try again.', 'error');
    } finally {
      setDeletingAgentId(null);
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await mutateAgents();
      toast.showToast('Successfully reloaded agents', 'success');
    } catch (error) {
      toast.showToast('Failed to reload agents. Please try again.', 'error');
    } finally {
      setIsRetrying(false);
    }
  };

  if (isLoading) {
    return <AgentListSkeleton />;
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading agents</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>Failed to load your agents. Please try again.</p>
            </div>
            <div className="mt-4">
              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRetrying ? (
                  <>
                    <Spinner size="xs" className="mr-2 text-red-600" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Retry
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agents</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your OpenClaw agent configurations
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          {showForm ? 'Cancel' : 'Add Agent'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
            Add New Agent
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Name *
              </label>
              <input
                type="text"
                name="name"
                id="name"
                required
                value={formData.name}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 text-gray-900 placeholder-gray-500"
                placeholder="My Agent"
              />
            </div>

            <div>
              <label htmlFor="openClawId" className="block text-sm font-medium text-gray-700">
                OpenClaw ID *
              </label>
              <input
                type="text"
                name="openClawId"
                id="openClawId"
                required
                value={formData.openClawId}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 text-gray-900 placeholder-gray-500"
                placeholder="agent-abc123"
              />
            </div>

            <div>
              <label htmlFor="model" className="block text-sm font-medium text-gray-700">
                Model
              </label>
              <input
                type="text"
                name="model"
                id="model"
                value={formData.model}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 text-gray-900 placeholder-gray-500"
                placeholder="gpt-4"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                name="description"
                id="description"
                rows={3}
                value={formData.description}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 text-gray-900 placeholder-gray-500"
                placeholder="Agent description..."
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Create Agent
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden rounded-md">
        <ul className="divide-y divide-gray-200">
          {agents && agents.length > 0 ? (
            agents.map((agent) => (
              <li key={agent.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <p className="text-sm font-medium text-indigo-600 truncate">
                        {agent.name}
                      </p>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        {agent.openClawId}
                      </span>
                      {healthStatus[agent.id] !== undefined && (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            healthStatus[agent.id]
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {healthStatus[agent.id] ? 'Online' : 'Offline'}
                        </span>
                      )}
                      {!agent.enabled && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                          Disabled
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center space-x-2">
                      {agent.model && (
                        <p className="text-sm text-gray-500">Model: {agent.model}</p>
                      )}
                      {agent.description && (
                        <>
                          {agent.model && <span className="text-gray-500">•</span>}
                          <p className="text-sm text-gray-500">{agent.description}</p>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleTestConnection(agent.id, agent.name)}
                      disabled={testingAgentId === agent.id}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {testingAgentId === agent.id ? (
                        <>
                          <Spinner size="xs" className="mr-2 text-indigo-600" />
                          Testing...
                        </>
                      ) : (
                        'Test Connection'
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(agent.id, agent.name)}
                      disabled={deletingAgentId === agent.id}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deletingAgentId === agent.id ? (
                        <>
                          <Spinner size="xs" className="mr-2 text-red-600" />
                          Deleting...
                        </>
                      ) : (
                        'Delete'
                      )}
                    </button>
                  </div>
                </div>
              </li>
            ))
          ) : (
            <EmptyAgents onCreate={() => setShowForm(true)} />
          )}
        </ul>
      </div>
    </div>
  );
}
