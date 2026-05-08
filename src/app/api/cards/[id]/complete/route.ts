export const dynamic = "force-dynamic";
import { authenticateAgent } from "@/server/agents/auth";
import { completeCard } from "@/server/cards/cardService";
import { CompleteSchema } from "@/server/cards/cardSchemas";
import { errorResponse, ok } from "@/server/http";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const agent = await authenticateAgent(req.headers.get("authorization"));
    const { id } = await ctx.params;
    const body = CompleteSchema.parse(await req.json());
    const card = await completeCard(agent, id, body.evidence);
    return ok(card);
  } catch (err) {
    return errorResponse(err);
  }
}
