export const dynamic = "force-dynamic";
import { authenticateAgent } from "@/server/agents/auth";
import { releaseCard } from "@/server/cards/cardService";
import { errorResponse, ok } from "@/server/http";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const agent = await authenticateAgent(req.headers.get("authorization"));
    const { id } = await ctx.params;
    const card = await releaseCard(agent, id);
    return ok(card);
  } catch (err) {
    return errorResponse(err);
  }
}
