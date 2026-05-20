'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Spinner } from '@/components/ui/Spinner';
import { useSearchParams } from 'next/navigation';

interface OpenClawConfig {
  gatewayUrl: string;
  apiKey: string;
  enabled: boolean;
}

interface SettingsData {
  openClaw: OpenClawConfig;
}

function SettingsContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const boardId = searchParams.get('boardId');
  const [settings, setSettings] = useState<SettingsData>({
    openClaw: {
      gatewayUrl: '',
      apiKey: '',
      enabled: true,
    },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (boardId) {
      loadSettings();
    }
  }, [boardId]);

  const loadSettings = async () => {
    if (!boardId) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/settings?boardId=${boardId}`);
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!boardId) {
      setError('Board ID is required');
      return;
    }

    setIsSaving(true);
    setError('');
    setConnectionTestResult(null);

    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boardId,
          ...settings,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setConnectionTestResult(null);

    try {
      const response = await fetch('/api/settings/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gatewayUrl: settings.openClaw.gatewayUrl,
          apiKey: settings.openClaw.apiKey,
        }),
      });

      const result = await response.json();
      setConnectionTestResult({
        success: result.success,
        message: result.message,
      });
    } catch (err) {
      setConnectionTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Connection test failed',
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  if (!boardId) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Board ID Required</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Please access settings from a specific board. Go to <a href="/dashboard/boards" className="underline font-medium">Boards</a> and select a board to configure its settings.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" className="text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Board Settings
          </h2>
          <p className="mt-1 text-sm text-gray-500">Configure settings for this board</p>
        </div>
      </div>

      {/* Profile Section */}
      <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Profile</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Your account information from Firebase
          </p>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Display Name</dt>
              <dd className="mt-1 text-sm text-gray-900">{user?.displayName || 'Not set'}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Email</dt>
              <dd className="mt-1 text-sm text-gray-900">{user?.email}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* OpenClaw Connection Section */}
      <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">OpenClaw Connection</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Configure your OpenClaw gateway connection for agent interactions
          </p>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:px-6 space-y-4">
          <div>
            <label htmlFor="gateway-url" className="block text-sm font-medium text-gray-700">
              Gateway URL
            </label>
            <input
              type="url"
              id="gateway-url"
              value={settings.openClaw.gatewayUrl}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  openClaw: { ...settings.openClaw, gatewayUrl: e.target.value },
                })
              }
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="https://api.openclaw.example.com"
            />
          </div>

          <div>
            <label htmlFor="api-key" className="block text-sm font-medium text-gray-700">
              API Key / Auth Token
            </label>
            <input
              type="password"
              id="api-key"
              value={settings.openClaw.apiKey}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  openClaw: { ...settings.openClaw, apiKey: e.target.value },
                })
              }
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Optional: Bearer token or auth=1454396ef3170429ff6833a412e6a291509e01b44ad087376f263107cb5844ef"
            />
            <p className="mt-1 text-xs text-gray-500">
              For Tailscale/remote connections, enter your auth token (e.g., from ws:// URL auth parameter). Leave blank if not required.
            </p>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="openclaw-enabled"
              checked={settings.openClaw.enabled}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  openClaw: { ...settings.openClaw, enabled: e.target.checked },
                })
              }
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="openclaw-enabled" className="ml-2 block text-sm text-gray-900">
              Enable OpenClaw integration
            </label>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTestingConnection || !settings.openClaw.gatewayUrl}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isTestingConnection ? (
                <>
                  <Spinner size="sm" className="mr-2 text-gray-700" />
                  Testing...
                </>
              ) : (
                'Test Connection'
              )}
            </button>

            {connectionTestResult && (
              <div
                className={`text-sm ${
                  connectionTestResult.success ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {connectionTestResult.message}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-8 flex justify-end space-x-3">
        {error && (
          <div className="flex-1 rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <>
              <Spinner size="sm" className="mr-2 text-white" />
              Saving...
            </>
          ) : (
            'Save Settings'
          )}
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" className="text-indigo-600" />
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}
