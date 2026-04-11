import { Bot } from 'grammy';
import { prisma } from '@/lib/db/prisma';

/**
 * Get Telegram bot token for a board
 */
export async function getBotTokenForBoard(boardId: string): Promise<string | null> {
  const telegramConfig = await prisma.telegramConfig.findUnique({
    where: { boardId },
  });

  if (!telegramConfig || !telegramConfig.enabled) {
    return null;
  }

  return telegramConfig.botToken;
}

/**
 * Get all active Telegram bot tokens
 */
export async function getAllActiveBotTokens(): Promise<Array<{ boardId: string; botToken: string }>> {
  const configs = await prisma.telegramConfig.findMany({
    where: { enabled: true },
    select: {
      boardId: true,
      botToken: true,
    },
  });

  return configs;
}

/**
 * Create a Grammy bot instance for a specific token
 */
export function createBot(token: string): Bot {
  return new Bot(token);
}

/**
 * Send message to Telegram chat
 */
export async function sendTelegramMessage(
  botToken: string,
  chatId: string | number,
  text: string,
  options?: {
    parseMode?: 'Markdown' | 'MarkdownV2' | 'HTML';
    disableWebPagePreview?: boolean;
  }
): Promise<boolean> {
  try {
    const bot = createBot(botToken);
    await bot.api.sendMessage(chatId, text, {
      parse_mode: options?.parseMode || 'HTML',
      link_preview_options: options?.disableWebPagePreview
        ? {
            is_disabled: true,
          }
        : undefined,
    });
    return true;
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    return false;
  }
}

/**
 * Format card URL for Telegram message
 */
export function formatCardUrl(cardId: string, baseUrl?: string): string {
  const appUrl = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://anban.app';
  return `${appUrl}/board/${cardId}`;
}

/**
 * Send card creation notification
 */
export async function notifyCardCreated(
  botToken: string,
  chatId: string | number,
  cardTitle: string,
  boardName: string,
  cardId: string,
  baseUrl?: string
): Promise<boolean> {
  const cardUrl = formatCardUrl(cardId, baseUrl);
  const message =
    `✅ Card created successfully!\n\n` +
    `📋 Board: ${boardName}\n` +
    `📝 Task: ${cardTitle}\n\n` +
    `🔗 View card: ${cardUrl}\n\n` +
    `⏳ Processing with agent...`;

  return sendTelegramMessage(botToken, chatId, message);
}

/**
 * Send agent completion notification
 */
export async function notifyAgentCompleted(
  botToken: string,
  chatId: string | number,
  cardTitle: string,
  agentResponse: string,
  cardId: string,
  baseUrl?: string
): Promise<boolean> {
  const cardUrl = formatCardUrl(cardId, baseUrl);

  // Truncate response if too long for Telegram (4096 char limit)
  const maxLength = 3000;
  const truncatedResponse =
    agentResponse.length > maxLength
      ? agentResponse.substring(0, maxLength) + '...\n\n(Response truncated)'
      : agentResponse;

  const message =
    `✨ Agent completed task!\n\n` +
    `📝 Task: ${cardTitle}\n\n` +
    `📄 Response:\n${truncatedResponse}\n\n` +
    `🔗 View full card: ${cardUrl}`;

  return sendTelegramMessage(botToken, chatId, message);
}

/**
 * Send error notification
 */
export async function notifyError(
  botToken: string,
  chatId: string | number,
  error: string
): Promise<boolean> {
  const message =
    `❌ Error occurred\n\n` +
    `📄 Details: ${error}\n\n` +
    `Please try again or contact support.`;

  return sendTelegramMessage(botToken, chatId, message);
}

/**
 * Send progress update during agent processing
 */
export async function notifyProgress(
  botToken: string,
  chatId: string | number,
  message: string
): Promise<boolean> {
  return sendTelegramMessage(botToken, chatId, `⏳ ${message}`);
}
