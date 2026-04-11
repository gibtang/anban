import { NextRequest, NextResponse } from 'next/server';
import { processTelegramUpdate } from '@/lib/telegram/bot';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Telegram webhook endpoint
 * Receives updates from Telegram bots and processes them
 */
export async function POST(request: NextRequest) {
  try {
    // Get webhook secret from environment
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

    if (webhookSecret) {
      // Verify webhook secret if configured
      const secretHeader = request.headers.get('x-telegram-webhook-secret');
      if (secretHeader !== webhookSecret) {
        console.error('Invalid webhook secret');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Parse the update from Telegram
    const update = await request.json();

    // Extract bot token from the update
    // Telegram updates don't include the bot token, so we need to find it
    // We'll use the chat ID or message to look up the correct bot
    const chatId = update.message?.chat?.id;
    const callbackQueryId = update.callback_query?.from?.id;

    const userIdentifier = chatId || callbackQueryId;

    if (!userIdentifier) {
      console.error('No user identifier in update');
      return NextResponse.json({ error: 'Invalid update' }, { status: 400 });
    }

    // Find the Telegram config for this chat
    // We need to search by chatId since we don't have the bot token
    const { prisma } = await import('@/lib/db/prisma');

    const telegramConfigs = await prisma.telegramConfig.findMany({
      where: {
        enabled: true,
      },
    });

    if (telegramConfigs.length === 0) {
      console.error('No active Telegram bots configured');
      return NextResponse.json({ ok: true }); // Return 200 to avoid Telegram retries
    }

    // Try each bot token until we find one that works
    // This is necessary because we don't know which bot the update is for
    let processed = false;

    for (const config of telegramConfigs) {
      try {
        // Process the update with this bot
        await processTelegramUpdate(config.botToken, update);
        processed = true;
        break; // Successfully processed, no need to try other bots
      } catch (error) {
        // This bot doesn't own this chat, try the next one
        console.debug(`Bot ${config.id} does not own chat ${userIdentifier}`);
        continue;
      }
    }

    if (!processed) {
      console.error(`No bot found for chat ${userIdentifier}`);
      // Still return 200 to avoid Telegram retries
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error in Telegram webhook:', error);
    // Always return 200 to Telegram to avoid retries on errors
    return NextResponse.json({ ok: true });
  }
}

/**
 * GET endpoint for webhook verification
 */
export async function GET(request: NextRequest) {
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (webhookSecret) {
    const secretHeader = request.headers.get('x-telegram-webhook-secret');
    if (secretHeader !== webhookSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return NextResponse.json({
    status: 'ok',
    message: 'Telegram webhook endpoint is active',
    timestamp: new Date().toISOString(),
  });
}
