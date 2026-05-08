import type { CardStatus } from "./cardStatus";

export type EventMetadata =
  | { type: "card_created"; requestedRole: string | null; priority: number }
  | { type: "card_claimed"; fromStatus: CardStatus }
  | { type: "comment_added" }
  | { type: "released"; reason: "voluntary" | "force" }
  | { type: "completed"; evidence: string };
