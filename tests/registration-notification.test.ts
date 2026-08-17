import { describe, test, beforeEach, afterEach, expect, mock } from 'bun:test';
import {
  notifyNewRegistration,
  sendWelcomeEmail,
  sendTelegramRegistrationAlert,
} from '../lib/notifications/registration';

const registration = { email: 'newuser@example.com', userId: 'user-1' };

const fetchMock = mock(async (_input: RequestInfo | URL, _init?: RequestInit) =>
  new Response('{}', { status: 200 }),
);

let savedEnv: Record<string, string | undefined> = {};

function setEnv(vars: Record<string, string>) {
  for (const key of ['RESEND_API_KEY', 'RESEND_FROM_EMAIL', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID']) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
  for (const [k, v] of Object.entries(vars)) process.env[k] = v;
}

beforeEach(() => {
  savedEnv = {};
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  fetchMock.mockClear();
});

afterEach(() => {
  for (const [k, v] of Object.entries(savedEnv)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

describe('registration notifications', () => {
  test('skips both providers when not configured', async () => {
    setEnv({});
    const emailed = await sendWelcomeEmail(registration);
    const telegraphed = await sendTelegramRegistrationAlert(registration);
    expect(emailed).toBe(false);
    expect(telegraphed).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('sends welcome email via Resend with default from address', async () => {
    setEnv({ RESEND_API_KEY: 're_test_key' });
    const ok = await sendWelcomeEmail(registration);
    expect(ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer re_test_key');
    const body = JSON.parse(init.body as string);
    expect(body.from).toBe('Anban <admin@a2z-soft.co>');
    expect(body.to).toBe('newuser@example.com');
    expect(body.subject).toBe('Welcome to Anban');
  });

  test('sends telegram alert with configured chat', async () => {
    setEnv({ TELEGRAM_BOT_TOKEN: 'bot123', TELEGRAM_CHAT_ID: '445474989' });
    const ok = await sendTelegramRegistrationAlert(registration);
    expect(ok).toBe(true);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.telegram.org/botbot123/sendMessage');
    const body = JSON.parse(init.body as string);
    expect(body.chat_id).toBe('445474989');
    expect(body.text).toContain('newuser@example.com');
  });

  test('provider failures never throw out of notifyNewRegistration', async () => {
    setEnv({ RESEND_API_KEY: 'k', TELEGRAM_BOT_TOKEN: 'b', TELEGRAM_CHAT_ID: '1' });
    globalThis.fetch = (async () => {
      throw new Error('network down');
    }) as unknown as typeof fetch;
    await expect(notifyNewRegistration(registration)).resolves.toBeUndefined();
  });
});
