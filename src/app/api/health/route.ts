export const dynamic = "force-dynamic";
import { prisma } from "@/server/prisma";
import { ok, errorResponse } from "@/server/http";

export async function GET() {
  try {
    await prisma.$runCommandRaw({ ping: 1 });
    return ok({ ok: true, db: "up" });
  } catch (err) {
    return errorResponse(err);
  }
}
