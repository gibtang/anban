export const dynamic = "force-dynamic";
import { authenticateAgent } from "@/server/agents/auth";
import { getCard } from "@/server/cards/cardService";
import { errorResponse, ok } from "@/server/http";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await authenticateAgent(req.headers.get("authorization"));
    const { id } = await ctx.params;
    const card = await getCard(id);
    return ok(card);
  } catch (err) {
    return errorResponse(err);
  }
}
