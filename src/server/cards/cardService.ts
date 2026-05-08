import { prisma } from "../prisma";
import { NotFoundError, ConflictError, ForbiddenError } from "../errors";
import { writeEvent } from "../eventRetry";
import type { Agent, Card } from "@prisma/client";

type CardWithOwner = Card & { ownerAgent?: { id: string; name: string; role: string } | null };

export async function createCard(
  agent: Agent,
  input: {
    title: string;
    description: string;
    requestedRole?: string | null | undefined;
    priority: number;
    acceptanceCriteria: string[];
  },
) {
  const card = await prisma.card.create({
    data: {
      title: input.title,
      description: input.description,
      requestedRole: input.requestedRole ?? null,
      priority: input.priority,
      acceptanceCriteria: input.acceptanceCriteria,
      createdByAgentId: agent.id,
    },
  });

  await writeEvent({
    cardId: card.id,
    agentId: agent.id,
    type: "card_created",
    message: `${agent.name} created this card.`,
    metadata: {
      type: "card_created",
      requestedRole: input.requestedRole ?? null,
      priority: input.priority,
    },
  });

  return formatCard(card);
}

export async function listAvailable(agent: Agent, role?: string) {
  const filterRole = role ?? agent.role;
  const cards = await prisma.card.findMany({
    where: {
      ownerAgentId: null,
      status: "todo",
      AND: [
        { OR: [{ requestedRole: null }, { requestedRole: filterRole }] },
        { OR: [{ assignedAgentId: null }, { assignedAgentId: agent.id }] },
      ],
    },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    take: 50,
  });
  return { cards: cards.map(formatCard) };
}

export async function getCard(cardId: string): Promise<CardWithOwner> {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: { ownerAgent: { select: { id: true, name: true, role: true } } },
  });
  if (!card) throw new NotFoundError("Card not found");
  return card as CardWithOwner;
}

export async function claimCard(agent: Agent, cardId: string) {
  const result = await prisma.card.updateMany({
    where: {
      id: cardId,
      ownerAgentId: null,
      status: "todo",
      AND: [
        { OR: [{ requestedRole: null }, { requestedRole: agent.role }] },
        { OR: [{ assignedAgentId: null }, { assignedAgentId: agent.id }] },
      ],
    },
    data: {
      status: "in_progress",
      ownerAgentId: agent.id,
      claimedAt: new Date(),
    },
  });

  if (result.count !== 1) {
    const existing = await prisma.card.findUnique({ where: { id: cardId } });
    if (!existing) throw new NotFoundError("Card not found");
    throw new ConflictError("Card is not available to claim");
  }

  await writeEvent({
    cardId,
    agentId: agent.id,
    type: "card_claimed",
    message: `${agent.name} claimed this card.`,
    metadata: { type: "card_claimed", fromStatus: "todo" },
  });

  return getCard(cardId);
}

export async function commentOnCard(agent: Agent, cardId: string, message: string) {
  const card = await prisma.card.findUnique({ where: { id: cardId } });
  if (!card) throw new NotFoundError("Card not found");
  if (card.ownerAgentId !== agent.id) throw new ForbiddenError("Not the card owner");
  if (card.status !== "in_progress") throw new ConflictError("Card is not in progress");

  await writeEvent({
    cardId,
    agentId: agent.id,
    type: "comment_added",
    message,
    metadata: { type: "comment_added" },
  });

  return getCard(cardId);
}

export async function releaseCard(agent: Agent, cardId: string) {
  const result = await prisma.card.updateMany({
    where: { id: cardId, ownerAgentId: agent.id, status: "in_progress" },
    data: { status: "todo", ownerAgentId: null, claimedAt: null },
  });
  if (result.count !== 1) throw new ConflictError("Card is not in a releasable state");

  await writeEvent({
    cardId,
    agentId: agent.id,
    type: "released",
    message: `${agent.name} released this card.`,
    metadata: { type: "released", reason: "voluntary" },
  });

  return getCard(cardId);
}

export async function completeCard(agent: Agent, cardId: string, evidence: string) {
  const result = await prisma.card.updateMany({
    where: { id: cardId, ownerAgentId: agent.id, status: "in_progress" },
    data: { status: "done", completedAt: new Date() },
  });
  if (result.count !== 1) throw new ConflictError("Card is not in a completable state");

  await writeEvent({
    cardId,
    agentId: agent.id,
    type: "completed",
    message: `${agent.name} completed this card.`,
    metadata: { type: "completed", evidence },
  });

  return getCard(cardId);
}

export async function assignCard(cardId: string, agentName: string) {
  const targetAgent = await prisma.agent.findUnique({ where: { name: agentName } });
  if (!targetAgent) throw new NotFoundError(`Agent "${agentName}" not found`);

  const result = await prisma.card.updateMany({
    where: { id: cardId, status: "todo", ownerAgentId: null },
    data: { assignedAgentId: targetAgent.id },
  });
  if (result.count !== 1) {
    const existing = await prisma.card.findUnique({ where: { id: cardId } });
    if (!existing) throw new NotFoundError("Card not found");
    throw new ConflictError("Card cannot be assigned (not in todo state or already claimed)");
  }

  await writeEvent({
    cardId,
    type: "card_assigned",
    message: `Card assigned to ${agentName}.`,
    metadata: { type: "card_assigned", assignedAgentId: targetAgent.id, assignedAgentName: agentName },
  });

  return getCard(cardId);
}

export async function forceReleaseCard(cardId: string, reason: string) {
  const result = await prisma.card.updateMany({
    where: { id: cardId, status: { in: ["todo", "in_progress"] } },
    data: { status: "todo", ownerAgentId: null, claimedAt: null },
  });
  if (result.count !== 1) {
    const existing = await prisma.card.findUnique({ where: { id: cardId } });
    if (!existing) throw new NotFoundError("Card not found");
    throw new ConflictError("Card cannot be force-released");
  }

  await writeEvent({
    cardId,
    type: "released",
    message: `Admin force-released this card: ${reason}`,
    metadata: { type: "released", reason: "force" },
  });

  return getCard(cardId);
}

export async function getCardEvents(
  cardId: string,
  limit: number,
  before?: string,
) {
  const where: Record<string, unknown> = { cardId };
  if (before) {
    where.createdAt = { lt: new Date(before) };
  }

  const events = await prisma.cardEvent.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
  });

  const hasMore = events.length > limit;
  const items = hasMore ? events.slice(0, limit) : events;

  return {
    events: items.map((e) => ({
      id: e.id,
      type: e.type,
      message: e.message,
      agentId: e.agentId,
      metadata: e.metadata,
      createdAt: e.createdAt,
    })),
    nextBefore: hasMore && items.length > 0 ? items[items.length - 1].createdAt.toISOString() : null,
  };
}

function formatCard(card: Card) {
  return {
    id: card.id,
    title: card.title,
    description: card.description,
    status: card.status,
    priority: card.priority,
    requestedRole: card.requestedRole,
    assignedAgentId: card.assignedAgentId,
    ownerAgentId: card.ownerAgentId,
    acceptanceCriteria: card.acceptanceCriteria,
    createdByAgentId: card.createdByAgentId,
    claimedAt: card.claimedAt,
    completedAt: card.completedAt,
    createdAt: card.createdAt,
    updatedAt: card.updatedAt,
  };
}
