import { Context } from 'grammy';
import { prisma } from '@/lib/db/prisma';

export interface ParsedMessage {
  boardName: string | null;
  taskDescription: string;
  isCommand: boolean;
}

/**
 * Parse incoming Telegram message to extract board name and task description
 * Supports multiple formats:
 * - "do X for board #Y" -> task: X, board: Y
 * - "X for board #Y" -> task: X, board: Y
 * - "board #Y: X" -> task: X, board: Y
 * - "#Y X" -> task: X, board: Y
 * - "X" -> task: X, board: null (default)
 */
export function parseMessage(text: string): ParsedMessage {
  const trimmedText = text.trim();

  // Check if it's a command
  if (trimmedText.startsWith('/')) {
    return {
      boardName: null,
      taskDescription: trimmedText,
      isCommand: true,
    };
  }

  // Pattern 1: "do X for board #Y" or "X for board #Y"
  const forBoardMatch = trimmedText.match(/^(?:do\s+)?(.+?)\s+for\s+board\s+#(\w+)$/i);
  if (forBoardMatch) {
    return {
      boardName: forBoardMatch[2],
      taskDescription: forBoardMatch[1].trim(),
      isCommand: false,
    };
  }

  // Pattern 2: "board #Y: X"
  const colonMatch = trimmedText.match(/^board\s+#(\w+):\s*(.+)$/i);
  if (colonMatch) {
    return {
      boardName: colonMatch[1],
      taskDescription: colonMatch[2].trim(),
      isCommand: false,
    };
  }

  // Pattern 3: "#Y X" (board name at start)
  const hashMatch = trimmedText.match(/^#(\w+)\s+(.+)$/);
  if (hashMatch) {
    return {
      boardName: hashMatch[1],
      taskDescription: hashMatch[2].trim(),
      isCommand: false,
    };
  }

  // Default: treat entire message as task description
  return {
    boardName: null,
    taskDescription: trimmedText,
    isCommand: false,
  };
}

/**
 * Find board by name or Telegram chat ID
 */
export async function findBoard(
  boardName: string | null,
  chatId: number | string
): Promise<{ id: string; name: string } | null> {
  // Try to find by board name first
  if (boardName) {
    const board = await prisma.board.findFirst({
      where: {
        name: {
          equals: boardName,
          // Case-insensitive search for MongoDB
        },
      },
    });

    if (board) {
      return board;
    }
  }

  // Fall back to finding by Telegram chat ID
  const telegramConfig = await prisma.telegramConfig.findFirst({
    where: {
      chatId: String(chatId),
    },
  });

  if (telegramConfig) {
    const board = await prisma.board.findUnique({
      where: { id: telegramConfig.boardId },
    });

    if (board) {
      return board;
    }
  }

  return null;
}

/**
 * Get user's boards for listing
 */
export async function getUserBoards(chatId: number | string): Promise<Array<{ id: string; name: string }>> {
  const telegramConfig = await prisma.telegramConfig.findFirst({
    where: {
      chatId: String(chatId),
    },
  });

  if (!telegramConfig) {
    return [];
  }

  const board = await prisma.board.findUnique({
    where: { id: telegramConfig.boardId },
  });

  return board ? [{ id: board.id, name: board.name }] : [];
}

/**
 * Get cards in a board
 */
export async function getBoardCards(boardId: string): Promise<
  Array<{
    id: string;
    title: string;
    columnName: string;
    position: number;
  }>
> {
  const cards = await prisma.card.findMany({
    where: { boardId },
    orderBy: { position: 'asc' },
  });

  const cardsWithColumns = await Promise.all(
    cards.map(async (card: { id: string; title: string; columnId: string; position: number }) => {
      const column = await prisma.column.findUnique({
        where: { id: card.columnId },
      });

      return {
        id: card.id,
        title: card.title,
        columnName: column?.name || 'Unknown',
        position: card.position,
      };
    })
  );

  return cardsWithColumns;
}

/**
 * Handle /start command
 */
export async function handleStartCommand(ctx: Context): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const message =
    '👋 Welcome to Anban Telegram Bot!\n\n' +
    'I can help you create tasks and cards in your Anban boards.\n\n' +
    '📝 How to use:\n' +
    '• "find X for board #fintech" - Create task in fintech board\n' +
    '• "board #marketing: review campaign" - Create task in marketing board\n' +
    '• "#sales contact leads" - Create task in sales board\n' +
    '• "do research" - Create task in your default board\n\n' +
    '📋 Commands:\n' +
    '/start - Show this welcome message\n' +
    '/help - Show usage examples\n' +
    '/boards - List your boards\n' +
    '/status [board] - Show cards in a board\n\n' +
    '💡 Tip: Set up your board in settings to use as default!';

  await ctx.reply(message);
}

/**
 * Handle /help command
 */
export async function handleHelpCommand(ctx: Context): Promise<void> {
  const message =
    '📖 Anban Bot Help\n\n' +
    '🎯 Creating Tasks:\n' +
    '• "do X for board #Y" - Create task X for board Y\n' +
    '• "X for board #Y" - Create task X for board Y\n' +
    '• "board #Y: X" - Create task X for board Y\n' +
    '• "#Y X" - Create task X for board Y\n' +
    '• Just text - Create task for default board\n\n' +
    '📋 Example:\n' +
    '• "find top 3 fintech websites for board #research"\n' +
    '• "board #fintech: analyze market trends"\n' +
    '• "#development fix login bug"\n\n' +
    '🔧 Commands:\n' +
    '/start - Welcome message\n' +
    '/help - Show this help\n' +
    '/boards - List your boards\n' +
    '/status [board] - Show cards (e.g., /status fintech)\n\n' +
    '⚙️ Setup:\n' +
    '1. Configure Telegram bot in your board settings\n' +
    '2. Link your Telegram chat ID\n' +
    '3. Set up OpenClaw agents for automation\n\n' +
    '❓ Questions? Check your Anban board settings.';

  await ctx.reply(message);
}

/**
 * Handle /boards command
 */
export async function handleBoardsCommand(ctx: Context): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const boards = await getUserBoards(chatId);

  if (boards.length === 0) {
    await ctx.reply(
      '❌ No boards found.\n\n' +
        'Please configure your Telegram bot in your board settings:\n' +
        '1. Go to your board settings\n' +
        '2. Add your Telegram bot token\n' +
        '3. Link your chat ID\n\n' +
        'Then use /start to begin!'
    );
    return;
  }

  let message = '📋 Your Boards:\n\n';
  boards.forEach((board, index) => {
    message += `${index + 1}. ${board.name}\n`;
  });

  message += '\n💡 Use "task for board #name" to create cards!';
  await ctx.reply(message);
}

/**
 * Handle /status command
 */
export async function handleStatusCommand(ctx: Context): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const text = ctx.message?.text || '';
  const parts = text.split(/\s+/);
  const boardNameArg = parts[1]?.replace(/^#/, '') || null;

  let boardId: string | null = null;
  let boardName: string | null = boardNameArg;

  // Try to find board by name
  if (boardName) {
    const board = await findBoard(boardName, chatId);
    if (board) {
      boardId = board.id;
      boardName = board.name;
    }
  }

  // Fall back to default board
  if (!boardId) {
    const telegramConfig = await prisma.telegramConfig.findFirst({
      where: { chatId: String(chatId) },
    });

    if (telegramConfig) {
      boardId = telegramConfig.boardId;
      const board = await prisma.board.findUnique({
        where: { id: boardId },
      });
      if (board) {
        boardName = board.name;
      }
    }
  }

  if (!boardId || !boardName) {
    await ctx.reply(
      '❌ Board not found.\n\n' +
        'Usage: /status [board-name]\n' +
        'Example: /status fintech\n\n' +
        'Use /boards to see your available boards.'
    );
    return;
  }

  const cards = await getBoardCards(boardId);

  if (cards.length === 0) {
    await ctx.reply(`📋 Board "${boardName}" - No cards yet.\n\n💡 Create one by sending a task!`);
    return;
  }

  let message = `📋 Board "${boardName}" - ${cards.length} card(s):\n\n`;

  const columnGroups: Record<string, Array<{ title: string; position: number }>> = {};
  cards.forEach((card) => {
    if (!columnGroups[card.columnName]) {
      columnGroups[card.columnName] = [];
    }
    columnGroups[card.columnName].push({ title: card.title, position: card.position });
  });

  Object.entries(columnGroups).forEach(([columnName, cards]) => {
    message += `📌 ${columnName}:\n`;
    cards
      .sort((a, b) => a.position - b.position)
      .forEach((card) => {
        message += `  • ${card.title}\n`;
      });
    message += '\n';
  });

  await ctx.reply(message);
}

/**
 * Handle task creation message
 */
export async function handleTaskMessage(
  ctx: Context,
  parsed: ParsedMessage
): Promise<{ boardId: string | null; boardName: string | null; error?: string }> {
  const chatId = ctx.chat?.id;
  if (!chatId) {
    return { boardId: null, boardName: null, error: 'Chat ID not found' };
  }

  const board = await findBoard(parsed.boardName, chatId);

  if (!board) {
    if (parsed.boardName) {
      const userBoards = await getUserBoards(chatId);
      const boardList = userBoards.map((b) => b.name).join(', ');
      return {
        boardId: null,
        boardName: null,
        error: `Board "#${parsed.boardName}" not found. Your boards: ${boardList || 'none'}`,
      };
    }
    return {
      boardId: null,
      boardName: null,
      error: 'No default board configured. Please set up your board in settings.',
    };
  }

  return {
    boardId: board.id,
    boardName: board.name,
  };
}
