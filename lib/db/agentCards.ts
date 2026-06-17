import { prisma } from '@/lib/db/prisma';

interface AgentCardResult {
  id: string;
  title: string;
  description: string | null;
  tags: string[];
  position: number;
  boardId: string;
  boardName: string;
  boardArchived: boolean;
  columnId: string;
  columnName: string;
  agentId: string | null;
  blocked: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Fetch cards assigned to an agent across all account boards.
 * Shared between agent API (Bearer auth) and human API (cookie auth).
 */
export async function getAgentCards(
  agentId: string,
  ownerId: string,
  boardId?: string
): Promise<AgentCardResult[]> {
  // Validate boardId format
  if (boardId && !/^[a-fA-F0-9]{24}$/.test(boardId)) {
    throw new Error('Invalid boardId format');
  }

  // Get all board IDs on this account (include archived for human view)
  const accountBoards = await prisma.board.findMany({
    where: {
      ownerId,
      ...(boardId ? { id: boardId } : {}),
    },
    select: { id: true, name: true, archived: true },
  });

  const boardIds = accountBoards.map((b: { id: string }) => b.id);
  const boardMap = new Map<string, { name: string; archived: boolean }>(
    accountBoards.map((b: { id: string; name: string; archived: boolean }) => [
      b.id,
      { name: b.name, archived: b.archived },
    ])
  );

  if (boardIds.length === 0) {
    return [];
  }

  const cards = await prisma.card.findMany({
    where: {
      agentId,
      boardId: { in: boardIds },
    },
    include: {
      column: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return cards.map(
    (card: {
      id: string;
      title: string;
      description: string | null;
      tags: string[];
      position: number;
      boardId: string;
      columnId: string;
      agentId: string | null;
      createdAt: Date;
      updatedAt: Date;
      column: { id: string; name: string };
    }) => {
      const board = boardMap.get(card.boardId);
      return {
        id: card.id,
        title: card.title,
        description: card.description,
        tags: card.tags,
        position: card.position,
        boardId: card.boardId,
        boardName: board?.name || 'Unknown',
        boardArchived: board?.archived || false,
        columnId: card.columnId,
        columnName: card.column.name,
        agentId: card.agentId,
        blocked: (card as any).blocked ?? null,
        createdAt: card.createdAt,
        updatedAt: card.updatedAt,
      };
    }
  );
}
