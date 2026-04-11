import { prisma } from '@/lib/db/prisma';

export interface CreateCardResult {
  success: boolean;
  cardId?: string;
  cardTitle?: string;
  error?: string;
}

/**
 * Find or create "To Do" column for a board
 */
export async function getOrCreateTodoColumn(boardId: string): Promise<{ id: string; position: number }> {
  // Try to find existing "To Do" column
  const existingColumn = await prisma.column.findFirst({
    where: {
      boardId,
      name: 'To Do',
    },
  });

  if (existingColumn) {
    return { id: existingColumn.id, position: existingColumn.position };
  }

  // Find the max position in the board
  const maxPositionColumn = await prisma.column.findFirst({
    where: { boardId },
    orderBy: { position: 'desc' },
  });

  const newPosition = maxPositionColumn ? maxPositionColumn.position + 1 : 0;

  // Create "To Do" column
  const newColumn = await prisma.column.create({
    data: {
      name: 'To Do',
      position: newPosition,
      boardId,
    },
  });

  return { id: newColumn.id, position: newColumn.position };
}

/**
 * Calculate position for a new card in a column
 */
export async function calculateCardPosition(columnId: string): Promise<number> {
  const maxPositionCard = await prisma.card.findFirst({
    where: { columnId },
    orderBy: { position: 'desc' },
  });

  return maxPositionCard ? maxPositionCard.position + 1 : 0;
}

/**
 * Create a card in a board
 */
export async function createCardInBoard(
  boardId: string,
  title: string,
  description?: string,
  tags: string[] = [],
  agentId?: string | null
): Promise<CreateCardResult> {
  try {
    // Get or create "To Do" column
    const { id: columnId } = await getOrCreateTodoColumn(boardId);

    // Calculate position
    const position = await calculateCardPosition(columnId);

    // Create card
    const card = await prisma.card.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        columnId,
        boardId,
        tags,
        agentId: agentId || null,
        position,
      },
    });

    return {
      success: true,
      cardId: card.id,
      cardTitle: card.title,
    };
  } catch (error) {
    console.error('Error creating card:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create card',
    };
  }
}

/**
 * Update card description
 */
export async function updateCardDescription(
  cardId: string,
  additionalContent: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const card = await prisma.card.findUnique({
      where: { id: cardId },
    });

    if (!card) {
      return { success: false, error: 'Card not found' };
    }

    const timestamp = new Date().toISOString();
    const responseBlock = `\n\n--- Agent Response (${timestamp}) ---\n${additionalContent}`;
    const newDescription = (card.description || '') + responseBlock;

    await prisma.card.update({
      where: { id: cardId },
      data: {
        description: newDescription,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating card:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update card',
    };
  }
}

/**
 * Get or create default agent for a board
 */
export async function getOrCreateDefaultAgent(boardId: string): Promise<string | null> {
  try {
    // Try to find an existing agent for this board
    const agents = await prisma.agentConfig.findMany({
      where: {
        ownerId: boardId, // Using boardId as ownerId for agents
        enabled: true,
      },
    });

    if (agents.length > 0) {
      // Return the first enabled agent
      return agents[0].id;
    }

    // No agent found - return null
    // The caller can decide whether to create a default agent
    return null;
  } catch (error) {
    console.error('Error finding agent:', error);
    return null;
  }
}
