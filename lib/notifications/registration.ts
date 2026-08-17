/**
 * Best-effort notifications for a newly registered Anban user.
 * Provider failures are deliberately contained: registration must not be
 * rolled back or delayed by a notification outage (same contract as the
 * geoduck registration-notification-service).
 *
 * Env (all optional — unset providers are skipped):
 *   RESEND_API_KEY         Resend API key for the welcome email
 *   RESEND_FROM_EMAIL      From address (default: Anban <admin@a2z-soft.co>)
 *   TELEGRAM_BOT_TOKEN     Telegram bot token for the registration alert
 *   TELEGRAM_CHAT_ID       Telegram chat id receiving the alert
 */

export interface RegistrationNotification {
  email: string;
  userId: string;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.getanban.com';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Fire welcome email + Telegram alert. Never throws. */
export async function notifyNewRegistration(
  registration: RegistrationNotification,
): Promise<void> {
  const results = await Promise.allSettled([
    sendWelcomeEmail(registration),
    sendTelegramRegistrationAlert(registration),
  ]);

  for (const result of results) {
    if (result.status === 'rejected') {
      console.error('[registration-notification] notification failed:', result.reason);
    }
  }
}

export async function sendWelcomeEmail(
  registration: RegistrationNotification,
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || 'Anban <admin@a2z-soft.co>';
  if (!apiKey) {
    console.warn('[welcome-email] RESEND_API_KEY not set; skipping send.');
    return false;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: registration.email,
        subject: 'Welcome to Anban',
        html: `
          <h2>Welcome to Anban</h2>
          <p>Your account is ready. Anban is a kanban board where humans and AI agents work on the same tickets.</p>
          <ul>
            <li>Create boards and columns like any kanban app</li>
            <li>Invite AI agents via a share link — they claim, update, and complete cards through the API</li>
            <li>Follow every change in the Activity feed</li>
          </ul>
          <p><a href="${APP_URL}/getting-started">Open Anban and get started →</a></p>
          <p style="color:#666;font-size:12px;">You received this email because a new Anban account was created for ${escapeHtml(registration.email)}.</p>
        `,
      }),
    });
    if (!response.ok) {
      console.error('[welcome-email] send failed:', response.status);
    }
    return response.ok;
  } catch (error) {
    console.error('[welcome-email] send failed:', (error as Error).message);
    return false;
  }
}

export async function sendTelegramRegistrationAlert(
  registration: RegistrationNotification,
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.warn('[telegram] registration alert not configured; skipping send.');
    return false;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: [
          'New getanban.com registration',
          `Email: ${registration.email}`,
        ].join('\n'),
      }),
    });
    if (!response.ok) {
      console.error('[telegram] registration alert failed:', response.status);
    }
    return response.ok;
  } catch (error) {
    console.error('[telegram] registration alert failed:', (error as Error).message);
    return false;
  }
}
