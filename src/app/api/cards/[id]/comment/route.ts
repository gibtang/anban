export const dynamic = "force-dynamic";
import { authenticateAgent } from "@/server/agents/auth";
import { commentOnCard } from "@/server/cards/cardService";
import { CommentSchema } from "@/server/cards/cardSchemas";
import { errorResponse, ok } from "@/server/http";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const agent = await authenticateAgent(req.headers.get("authorization"));
    const { id } = await ctx.params;
    const body = CommentSchema.parse(await req.json());
    const card = await commentOnCard(agent, id, body.message);
    return ok(card, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
