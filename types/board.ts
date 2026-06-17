import type { Card } from './card';

export interface Column {
  id: string;
  name: string;
  position: number;
  boardId: string;
  createdAt: string;
  cards?: Card[];
}

export interface Board {
  id: string;
  name: string;
  description?: string | null;
  ownerId: string;
  favorited?: boolean;
  archived?: boolean;
  createdAt: string;
  updatedAt: string;
  columns?: Column[];
  openCardCount?: number;
  _count?: {
    cards: number;
  };
}

export interface CreateBoardRequest {
  name: string;
  description?: string;
}

export interface UpdateBoardRequest {
  name: string;
  description?: string | null;
}
