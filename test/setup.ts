import { afterAll, beforeEach } from "vitest";
import { prisma } from "@/server/prisma";

beforeEach(async () => {
  await prisma.cardEvent.deleteMany({});
  await prisma.card.deleteMany({});
  await prisma.agent.deleteMany({});
});

afterAll(async () => {
  await prisma.$disconnect();
});
