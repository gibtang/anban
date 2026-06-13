export interface Card {
  id: string;
  title: string;
  description: string | null;
  position: number;
  columnId: string;
  boardId: string;
  tags: string[];
  agentId: string | null;
  blocked: string | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCardRequest {
  title: string;
  description?: string;
  columnId: string;
  boardId: string;
  tags?: string[];
  agentId?: string;
  blocked?: string | null;
}

export interface UpdateCardRequest {
  title?: string;
  description?: string;
  columnId?: string;
  position?: number;
  tags?: string[];
  agentId?: string | null;
  blocked?: string | null;
}
