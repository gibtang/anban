export const dynamic = "force-dynamic";
import { authenticateAgent } from "@/server/agents/auth";
import { createCard } from "@/server/cards/cardService";
import { CreateCardSchema } from "@/server/cards/cardSchemas";
import { errorResponse, ok } from "@/server/http";

export async function POST(req: Request) {
  try {
    const agent = await authenticateAgent(req.headers.get("authorization"));
    const body = CreateCardSchema.parse(await req.json());
    const card = await createCard(agent, body);
    return ok(card, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
