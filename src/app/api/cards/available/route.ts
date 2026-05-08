export const dynamic = "force-dynamic";
import { authenticateAgent } from "@/server/agents/auth";
import { listAvailable } from "@/server/cards/cardService";
import { errorResponse, ok } from "@/server/http";

export async function GET(req: Request) {
  try {
    const agent = await authenticateAgent(req.headers.get("authorization"));
    const url = new URL(req.url);
    const role = url.searchParams.get("role") ?? undefined;
    const result = await listAvailable(agent, role);
    return ok(result);
  } catch (err) {
    return errorResponse(err);
  }
}
