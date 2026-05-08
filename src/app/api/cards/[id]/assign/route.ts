export const dynamic = "force-dynamic";
import { env } from "@/server/env";
import { assignCard } from "@/server/cards/cardService";
import { AssignSchema } from "@/server/cards/cardSchemas";
import { UnauthorizedError } from "@/server/errors";
import { errorResponse, ok } from "@/server/http";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";
    if (token !== env.KANBAN_ADMIN_TOKEN) {
      throw new UnauthorizedError("Admin token required");
    }

    const { id } = await ctx.params;
    const body = AssignSchema.parse(await req.json());
    const card = await assignCard(id, body.agentName);
    return ok(card);
  } catch (err) {
    return errorResponse(err);
  }
}
