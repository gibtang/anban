import { activities, toIdOrNull, type ActivityDoc } from './mongo';

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
  await activities.insertOne({
    cardId: toIdOrNull(params.cardId),
    boardId: toIdOrNull(params.boardId),
    type: params.type,
    authorId: toIdOrNull(params.authorId),
    authorName: params.authorName,
    authorType: params.authorType,
    ...(params.details !== undefined ? { details: params.details } : {}),
    createdAt: new Date(),
  });
}

export type { ActivityDoc };
