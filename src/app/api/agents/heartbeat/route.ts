export const dynamic = "force-dynamic";
import { HeartbeatSchema } from "@/server/agents/agentSchemas";
import { authenticateAgent } from "@/server/agents/auth";
import { heartbeat } from "@/server/agents/agentService";
import { errorResponse, ok } from "@/server/http";

export async function POST(req: Request) {
  try {
    const agent = await authenticateAgent(req.headers.get("authorization"));
    const body = HeartbeatSchema.parse(await req.json());
    const result = await heartbeat(agent, body.status);
    return ok(result);
  } catch (err) {
    return errorResponse(err);
  }
}
