import { prisma } from "./prisma";

const MAX_RETRIES = 2;
const BACKOFF_MS = 100;

export async function writeEvent(data: {
  cardId: string;
  agentId?: string | null;
  type: string;
  message: string;
  metadata?: unknown;
}): Promise<void> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      await prisma.cardEvent.create({
        data: {
          cardId: data.cardId,
          agentId: data.agentId ?? undefined,
          type: data.type as never,
          message: data.message,
          metadata: data.metadata ?? undefined,
        },
      });
      return;
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, BACKOFF_MS * (attempt + 1)));
        continue;
      }
      console.error("Failed to write event after retries", {
        cardId: data.cardId,
        type: data.type,
        err,
      });
    }
  }
}
