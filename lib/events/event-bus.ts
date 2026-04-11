import { EventEmitter } from 'events';

type BoardEvent =
  | { type: 'card.created'; boardId: string; cardId: string; columnId: string }
  | { type: 'card.moved'; boardId: string; cardId: string; fromColumnId: string; toColumnId: string }
  | { type: 'card.updated'; boardId: string; cardId: string }
  | { type: 'card.deleted'; boardId: string; cardId: string }
  | { type: 'agent.message'; boardId: string; agentId: string; messageId: string };

class EventBus extends EventEmitter {
  emitEvent(event: BoardEvent) {
    this.emit(event.type, event);
    this.emit(`board:${event.boardId}`, event);
  }
}

export const eventBus = new EventBus();