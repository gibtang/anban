export const dynamic = "force-dynamic";
import { authenticateAgent } from "@/server/agents/auth";
import { getMe } from "@/server/agents/agentService";
import { errorResponse, ok } from "@/server/http";

export async function GET(req: Request) {
  try {
    const agent = await authenticateAgent(req.headers.get("authorization"));
    const result = await getMe(agent);
    return ok(result);
  } catch (err) {
    return errorResponse(err);
  }
}
