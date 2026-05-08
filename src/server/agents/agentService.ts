import { prisma } from "../prisma";
import { env } from "../env";
import { generateRawToken } from "./tokens";
import { ConflictError, UnauthorizedError } from "../errors";
import type { Agent } from "@prisma/client";

export async function registerAgent(input: {
  registrationToken: string;
  name: string;
  role: string;
  capabilities: string[];
}) {
  if (input.registrationToken !== env.KANBAN_REGISTRATION_TOKEN) {
    throw new UnauthorizedError("Invalid registration token");
  }

  const existing = await prisma.agent.findUnique({ where: { name: input.name } });
  if (existing) {
    throw new ConflictError(`Agent "${input.name}" already exists`);
  }

  const { raw, prefix, hash } = generateRawToken();
  const agent = await prisma.agent.create({
    data: {
      name: input.name,
      role: input.role,
      capabilities: input.capabilities,
      tokenPrefix: prefix,
      tokenHash: hash,
      lastSeenAt: new Date(),
    },
  });

  return {
    agentId: agent.id,
    name: agent.name,
    role: agent.role,
    capabilities: agent.capabilities,
    apiToken: raw,
  };
}

export async function heartbeat(agent: Agent, status: string) {
  const updated = await prisma.agent.update({
    where: { id: agent.id },
    data: { lastSeenAt: new Date() },
  });
  return { agentId: updated.id, lastSeenAt: updated.lastSeenAt };
}

export async function getMe(agent: Agent) {
  const currentCard = await prisma.card.findFirst({
    where: { ownerAgentId: agent.id, status: "in_progress" },
  });

  return {
    agentId: agent.id,
    name: agent.name,
    role: agent.role,
    lastSeenAt: agent.lastSeenAt,
    currentCard: currentCard
      ? {
          id: currentCard.id,
          title: currentCard.title,
          status: currentCard.status,
        }
      : null,
  };
}
