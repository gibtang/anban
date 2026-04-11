import { Bot, GrammyError } from 'grammy';
import {
  handleStartCommand,
  handleHelpCommand,
  handleBoardsCommand,
  handleStatusCommand,
  handleTaskMessage,
  parseMessage,
} from './handlers';
import { createCardInBoard, updateCardDescription } from './card-creator';
import { sendTaskToBoardAgent } from './openclaw-integration';
import {
  notifyCardCreated,
  notifyAgentCompleted,
  notifyError,
  notifyProgress,
  getBotTokenForBoard,
} from './notifications';
import { prisma } from '@/lib/db/prisma';

/**
 * Process a Telegram update
 */
export async function processTelegramUpdate(botToken: string, update: any): Promise<void> {
  const bot = new Bot(botToken);

  // Handle the update
  bot.on('message:text', async (ctx) => {
    const text = ctx.message?.text;
    if (!text) return;

    const chatId = ctx.chat?.id;
    if (!chatId) return;

    const parsed = parseMessage(text);

    try {
      // Handle commands
      if (parsed.isCommand) {
        if (text === '/start') {
          await handleStartCommand(ctx);
        } else if (text === '/help') {
          await handleHelpCommand(ctx);
        } else if (text === '/boards') {
          await handleBoardsCommand(ctx);
        } else if (text.startsWith('/status')) {
          await handleStatusCommand(ctx);
        } else {
          await ctx.reply('Unknown command. Use /help to see available commands.');
        }
        return;
      }

      // Handle task creation
      if (parsed.taskDescription) {
        // Find board
        const boardResult = await handleTaskMessage(ctx, parsed);

        if (boardResult.error) {
          await ctx.reply(`❌ ${boardResult.error}\n\n💡 Use /help for usage examples.`);
          return;
        }

        if (!boardResult.boardId || !boardResult.boardName) {
          await ctx.reply('❌ Could not determine board. Please use /help for usage examples.');
          return;
        }

        // Notify user that we're creating the card
        await notifyProgress(botToken, chatId, 'Creating card...');

        // Create card
        const cardResult = await createCardInBoard(
          boardResult.boardId,
          parsed.taskDescription,
          `Task created via Telegram\n\nOriginal message: ${parsed.taskDescription}`
        );

        if (!cardResult.success) {
          await ctx.reply(`❌ Failed to create card: ${cardResult.error}`);
          return;
        }

        // Notify card created
        await notifyCardCreated(
          botToken,
          chatId,
          cardResult.cardTitle || parsed.taskDescription,
          boardResult.boardName,
          cardResult.cardId || boardResult.boardId // Use boardId as fallback for URL
        );

        // Send task to agent
        await notifyProgress(botToken, chatId, 'Sending task to agent...');

        const agentResult = await sendTaskToBoardAgent(
          boardResult.boardId,
          parsed.taskDescription,
          async (chunk) => {
            // Optional: Send progress updates during streaming
            // Not sending every chunk to avoid spam
          }
        );

        if (!agentResult.success) {
          await notifyError(botToken, chatId, agentResult.error || 'Agent communication failed');
          return;
        }

        // Update card with agent response
        if (cardResult.cardId && agentResult.response) {
          await updateCardDescription(cardResult.cardId, agentResult.response);
        }

        // Notify completion
        await notifyAgentCompleted(
          botToken,
          chatId,
          cardResult.cardTitle || parsed.taskDescription,
          agentResult.response || 'No response from agent',
          cardResult.cardId || boardResult.boardId
        );
      }
    } catch (error) {
      console.error('Error processing message:', error);
      await ctx.reply(
        '❌ An error occurred while processing your request. Please try again later.'
      );
    }
  });

  // Handle callback queries (for inline keyboards)
  bot.on('callback_query:data', async (ctx) => {
    await ctx.answerCallbackQuery();
    // Handle button presses here if needed
  });

  // Process the update
  try {
    await bot.handleUpdate(update);
  } catch (error) {
    if (error instanceof GrammyError) {
      console.error('Grammy error:', error.description);
    } else {
      console.error('Error handling update:', error);
    }
  }
}

/**
 * Create a bot instance for testing purposes
 */
export function createTestBot(botToken: string): Bot {
  const bot = new Bot(botToken);

  // Register commands
  bot.command('start', async (ctx) => {
    await handleStartCommand(ctx);
  });

  bot.command('help', async (ctx) => {
    await handleHelpCommand(ctx);
  });

  bot.command('boards', async (ctx) => {
    await handleBoardsCommand(ctx);
  });

  bot.command('status', async (ctx) => {
    await handleStatusCommand(ctx);
  });

  // Handle text messages
  bot.on('message:text', async (ctx) => {
    const text = ctx.message?.text;
    if (!text) return;

    const parsed = parseMessage(text);

    // Skip if it's a command (already handled)
    if (parsed.isCommand) return;

    // Handle task creation
    if (parsed.taskDescription) {
      const boardResult = await handleTaskMessage(ctx, parsed);

      if (boardResult.error) {
        await ctx.reply(`❌ ${boardResult.error}\n\n💡 Use /help for usage examples.`);
        return;
      }

      if (!boardResult.boardId || !boardResult.boardName) {
        await ctx.reply('❌ Could not determine board. Please use /help for usage examples.');
        return;
      }

      await notifyProgress(botToken, ctx.chat?.id || 0, 'Creating card...');

      const cardResult = await createCardInBoard(
        boardResult.boardId,
        parsed.taskDescription,
        `Task created via Telegram\n\nOriginal message: ${parsed.taskDescription}`
      );

      if (!cardResult.success) {
        await ctx.reply(`❌ Failed to create card: ${cardResult.error}`);
        return;
      }

      await notifyCardCreated(
        botToken,
        ctx.chat?.id || 0,
        cardResult.cardTitle || parsed.taskDescription,
        boardResult.boardName,
        cardResult.cardId || boardResult.boardId
      );

      await notifyProgress(botToken, ctx.chat?.id || 0, 'Sending task to agent...');

      const agentResult = await sendTaskToBoardAgent(boardResult.boardId, parsed.taskDescription);

      if (!agentResult.success) {
        await notifyError(botToken, ctx.chat?.id || 0, agentResult.error || 'Agent communication failed');
        return;
      }

      if (cardResult.cardId && agentResult.response) {
        await updateCardDescription(cardResult.cardId, agentResult.response);
      }

      await notifyAgentCompleted(
        botToken,
        ctx.chat?.id || 0,
        cardResult.cardTitle || parsed.taskDescription,
        agentResult.response || 'No response from agent',
        cardResult.cardId || boardResult.boardId
      );
    }
  });

  return bot;
}

/**
 * Get bot information
 */
export async function getBotInfo(botToken: string): Promise<{ id: number; username: string } | null> {
  try {
    const bot = new Bot(botToken);
    const me = await bot.api.getMe();
    return {
      id: me.id,
      username: me.username,
    };
  } catch (error) {
    console.error('Error getting bot info:', error);
    return null;
  }
}

/**
 * Set webhook for a bot
 */
export async function setBotWebhook(botToken: string, webhookUrl: string): Promise<boolean> {
  try {
    const bot = new Bot(botToken);
    await bot.api.setWebhook(webhookUrl);
    return true;
  } catch (error) {
    console.error('Error setting webhook:', error);
    return false;
  }
}

/**
 * Delete webhook for a bot
 */
export async function deleteBotWebhook(botToken: string): Promise<boolean> {
  try {
    const bot = new Bot(botToken);
    await bot.api.deleteWebhook();
    return true;
  } catch (error) {
    console.error('Error deleting webhook:', error);
    return false;
  }
}
