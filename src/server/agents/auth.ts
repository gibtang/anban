import { prisma } from "../prisma";
import { hashToken, safeEqual, tokenPrefix } from "./tokens";
import { UnauthorizedError } from "../errors";

export async function authenticateAgent(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing bearer token");
  }
  const raw = authHeader.slice("Bearer ".length).trim();
  if (!raw.startsWith("ak_")) throw new UnauthorizedError("Invalid token format");

  const prefix = tokenPrefix(raw);
  const agent = await prisma.agent.findUnique({ where: { tokenPrefix: prefix } });
  if (!agent || !agent.isActive) throw new UnauthorizedError("Invalid token");

  const candidateHash = hashToken(raw);
  if (!safeEqual(candidateHash, agent.tokenHash)) {
    throw new UnauthorizedError("Invalid token");
  }

  return agent;
}
