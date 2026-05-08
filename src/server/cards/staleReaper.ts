import { prisma } from "../prisma";
import { writeEvent } from "../eventRetry";

const DEFAULT_STALE_MINUTES = 30;

export async function reapStaleClaims(staleMinutes = DEFAULT_STALE_MINUTES): Promise<number> {
  const cutoff = new Date(Date.now() - staleMinutes * 60 * 1000);

  const staleCards = await prisma.card.findMany({
    where: {
      status: "in_progress",
      claimedAt: { lt: cutoff },
      ownerAgent: { lastSeenAt: { lt: cutoff } },
    },
    select: { id: true },
  });

  if (staleCards.length === 0) return 0;

  const ids = staleCards.map((c) => c.id);

  await prisma.card.updateMany({
    where: { id: { in: ids } },
    data: { status: "todo", ownerAgentId: null, claimedAt: null },
  });

  await Promise.all(
    ids.map((cardId) =>
      writeEvent({
        cardId,
        type: "released",
        message: `Stale claim auto-reaped (no heartbeat for ${staleMinutes}m).`,
        metadata: { type: "released", reason: "force" },
      }),
    ),
  );

  return ids.length;
}
