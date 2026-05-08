export const CARD_STATUSES = ["todo", "in_progress", "done"] as const;

export type CardStatus = (typeof CARD_STATUSES)[number];

export const VALID_TRANSITIONS: Record<CardStatus, CardStatus[]> = {
  todo: ["in_progress"],
  in_progress: ["todo", "done"],
  done: [],
};

export function assertTransition(from: CardStatus, to: CardStatus): void {
  if (!VALID_TRANSITIONS[from].includes(to)) {
    throw new Error(`Cannot transition card from ${from} to ${to}`);
  }
}
