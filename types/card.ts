export interface Card {
  id: string;
  title: string;
  description: string | null;
  position: number;
  columnId: string;
  boardId: string;
  assigneeId: string | null;
  tags: string[];
  agentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCardRequest {
  title: string;
  description?: string;
  columnId: string;
  boardId: string;
  assigneeId?: string;
  tags?: string[];
  agentId?: string;
}

export interface UpdateCardRequest {
  title?: string;
  description?: string;
  columnId?: string;
  position?: number;
  assigneeId?: string | null;
  tags?: string[];
  agentId?: string | null;
}
