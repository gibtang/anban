import { randomBytes } from "node:crypto";
import { prisma } from "../prisma";
import { env } from "../env";
import { generateRawToken } from "./tokens";
import { sendApprovalEmail } from "./approvalEmail";
import { ConflictError, UnauthorizedError, NotFoundError } from "../errors";
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
  const approvalToken = randomBytes(32).toString("hex");

  const agent = await prisma.agent.create({
    data: {
      name: input.name,
      role: input.role,
      capabilities: input.capabilities,
      tokenPrefix: prefix,
      tokenHash: hash,
      approvalToken,
      lastSeenAt: new Date(),
    },
  });

  // Send approval email (best-effort, don't block registration)
  sendApprovalEmail(agent.name, agent.id, approvalToken).catch((err) => {
    console.error("Failed to send approval email", { agentId: agent.id, err });
  });

  return {
    agentId: agent.id,
    name: agent.name,
    role: agent.role,
    capabilities: agent.capabilities,
    apiToken: raw,
    status: "pending_approval",
    message: `Agent registered. An approval email has been sent. The agent cannot use the API until approved.`,
  };
}

export async function approveAgent(agentId: string, token: string) {
  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (!agent) throw new NotFoundError("Agent not found");
  if (agent.approvalToken !== token) throw new UnauthorizedError("Invalid approval token");
  if (agent.isActive) return { agentId: agent.id, name: agent.name, status: "already_approved" };

  await prisma.agent.update({
    where: { id: agentId },
    data: { isActive: true, approvalToken: null },
  });

  return { agentId: agent.id, name: agent.name, status: "approved" };
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
