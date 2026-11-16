import { boards, cards, columns, toId, toIdOrNull, type CardDoc } from './mongo';

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
  const accountBoards = await boards.find({
    ownerId: toId(ownerId),
    ...(boardId ? { _id: toId(boardId) } : {}),
  });

  const boardMap = new Map<string, { name: string; archived: boolean }>(
    accountBoards.map((b) => [b.id, { name: b.name, archived: b.archived }])
  );

  if (accountBoards.length === 0) {
    return [];
  }

  const cardDocs = await cards.find(
    { agentId: toId(agentId), boardId: { $in: accountBoards.map((b) => toId(b.id)) } },
    { sort: { createdAt: -1 } }
  );
  const columnIds = [...new Set(cardDocs.map((c) => c.columnId))];
  const columnDocs = columnIds.length
    ? await columns.find({ _id: { $in: columnIds.map(toId) } })
    : [];
  const columnMap = new Map(columnDocs.map((c) => [c.id, c.name]));

  return cardDocs.map((card: CardDoc) => {
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
      columnName: columnMap.get(card.columnId) || 'Unknown',
      agentId: card.agentId,
      blocked: card.blocked,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
    };
  });
}
