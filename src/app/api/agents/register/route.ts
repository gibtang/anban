export const dynamic = "force-dynamic";
import { RegisterAgentSchema } from "@/server/agents/agentSchemas";
import { registerAgent } from "@/server/agents/agentService";
import { errorResponse, ok } from "@/server/http";

export async function POST(req: Request) {
  try {
    const body = RegisterAgentSchema.parse(await req.json());
    const result = await registerAgent(body);
    return ok(result, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
