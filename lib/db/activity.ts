import { prisma } from './prisma';

export interface ActivityParams {
  cardId: string;
  boardId: string;
  type: 'created' | 'moved' | 'updated' | 'assigned' | 'unassigned' | 'commented' | 'deleted';
  authorId?: string;
  authorName: string;
  authorType: 'user' | 'agent' | 'system';
  details?: Record<string, unknown>;
}

export async function logActivity(params: ActivityParams) {
  await prisma.activity.create({
    data: {
      cardId: params.cardId,
      boardId: params.boardId,
      type: params.type,
      authorId: params.authorId ?? null,
      authorName: params.authorName,
      authorType: params.authorType,
      details: params.details ?? undefined,
    },
  });
}
