export const dynamic = "force-dynamic";
import { authenticateAgent } from "@/server/agents/auth";
import { getCardEvents } from "@/server/cards/cardService";
import { EventsQuerySchema } from "@/server/cards/cardSchemas";
import { errorResponse, ok } from "@/server/http";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await authenticateAgent(req.headers.get("authorization"));
    const { id } = await ctx.params;
    const url = new URL(req.url);
    const query = EventsQuerySchema.parse({
      limit: url.searchParams.get("limit") ?? undefined,
      before: url.searchParams.get("before") ?? undefined,
    });
    const result = await getCardEvents(id, query.limit, query.before);
    return ok(result);
  } catch (err) {
    return errorResponse(err);
  }
}
