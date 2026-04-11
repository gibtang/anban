'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSearchParams } from 'next/navigation';

interface OpenClawConfig {
  gatewayUrl: string;
  apiKey: string;
  enabled: boolean;
}

interface TelegramConfig {
  botToken: string;
  username: string;
  chatId: string;
  enabled: boolean;
}

interface SettingsData {
  openClaw: OpenClawConfig;
  telegram: TelegramConfig;
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
    telegram: {
      botToken: '',
      username: '',
      chatId: '',
      enabled: true,
    },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isLookingUpBot, setIsLookingUpBot] = useState(false);
  const [botLookupResult, setBotLookupResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [botUsernameInput, setBotUsernameInput] = useState('');
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

  const handleLookupBot = async () => {
    if (!botUsernameInput.trim()) {
      setBotLookupResult({
        success: false,
        message: 'Please enter a bot username',
      });
      return;
    }

    setIsLookingUpBot(true);
    setBotLookupResult(null);
    setError('');

    try {
      const response = await fetch('/api/telegram/lookup-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: botUsernameInput.trim(),
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        // Auto-populate settings with found configuration
        if (result.data.openClawConfig) {
          setSettings({
            ...settings,
            openClaw: {
              gatewayUrl: result.data.openClawConfig.gatewayUrl,
              apiKey: result.data.openClawConfig.apiKey,
              enabled: result.data.openClawConfig.enabled,
            },
            telegram: {
              ...settings.telegram,
              username: result.data.botName,
            },
          });
        }

        setBotLookupResult({
          success: true,
          message: result.data.status === 'linked'
            ? `Bot ${result.data.botName} found and linked to OpenClaw agent. Configuration loaded.`
            : `Bot ${result.data.botName} found but not linked to OpenClaw agent. Telegram config loaded.`,
        });
      } else {
        setBotLookupResult({
          success: false,
          message: result.error || 'Failed to look up bot configuration',
        });
      }
    } catch (err) {
      setBotLookupResult({
        success: false,
        message: err instanceof Error ? err.message : 'Bot lookup failed',
      });
    } finally {
      setIsLookingUpBot(false);
    }
  };

  if (!boardId) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
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
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="https://api.openclaw.example.com"
            />
          </div>

          <div>
            <label htmlFor="api-key" className="block text-sm font-medium text-gray-700">
              API Key
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
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="your-api-key"
            />
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
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
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

      {/* Telegram Bot Section */}
      <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Telegram Bot</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Configure Telegram bot for board notifications and updates
          </p>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:px-6 space-y-4">
          {/* Bot Username Lookup */}
          <div>
            <label htmlFor="bot-username-lookup" className="block text-sm font-medium text-gray-700">
              Bot Username Lookup
            </label>
            <div className="mt-1 flex space-x-2">
              <input
                type="text"
                id="bot-username-lookup"
                value={botUsernameInput}
                onChange={(e) => setBotUsernameInput(e.target.value)}
                className="flex-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="@gibtang_bot"
                onKeyDown={(e) => e.key === 'Enter' && handleLookupBot()}
              />
              <button
                type="button"
                onClick={handleLookupBot}
                disabled={isLookingUpBot || !botUsernameInput.trim()}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLookingUpBot ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Looking up...
                  </>
                ) : (
                  'Auto-Configure'
                )}
              </button>
            </div>
            {botLookupResult && (
              <div
                className={`mt-2 text-sm ${
                  botLookupResult.success ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {botLookupResult.message}
              </div>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Enter your bot username to automatically look up and configure OpenClaw settings
            </p>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <label htmlFor="bot-username" className="block text-sm font-medium text-gray-700">
              Bot Username
            </label>
            <input
              type="text"
              id="bot-username"
              value={settings.telegram.username}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  telegram: { ...settings.telegram, username: e.target.value },
                })
              }
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="@gibtang_bot"
            />
            <p className="mt-1 text-xs text-gray-500">
              Your bot username for identification
            </p>
          </div>

          <div>
            <label htmlFor="bot-token" className="block text-sm font-medium text-gray-700">
              Bot Token
            </label>
            <input
              type="password"
              id="bot-token"
              value={settings.telegram.botToken}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  telegram: { ...settings.telegram, botToken: e.target.value },
                })
              }
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
            />
            <p className="mt-1 text-xs text-gray-500">
              Get your bot token from{' '}
              <a
                href="https://core.telegram.org/bots#botfather"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-500"
              >
                BotFather
              </a>
            </p>
          </div>

          <div>
            <label htmlFor="chat-id" className="block text-sm font-medium text-gray-700">
              Chat ID
            </label>
            <input
              type="text"
              id="chat-id"
              value={settings.telegram.chatId}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  telegram: { ...settings.telegram, chatId: e.target.value },
                })
              }
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="-1001234567890"
            />
            <p className="mt-1 text-xs text-gray-500">
              The chat ID where notifications will be sent
            </p>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="telegram-enabled"
              checked={settings.telegram.enabled}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  telegram: { ...settings.telegram, enabled: e.target.checked },
                })
              }
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="telegram-enabled" className="ml-2 block text-sm text-gray-900">
              Enable Telegram notifications
            </label>
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
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}
