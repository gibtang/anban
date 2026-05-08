export const dynamic = "force-dynamic";
import { approveAgent } from "@/server/agents/agentService";
import { errorResponse } from "@/server/http";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    if (!token) return errorResponse(new Error("Missing token parameter"));

    const result = await approveAgent(id, token);

    const message = result.status === "already_approved"
      ? `Agent ${result.name} was already approved.`
      : `Agent ${result.name} approved`;

    return new Response(
      `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Agent Approval</title></head>
<body style="display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;font-family:sans-serif;background:#0a0a0a;color:#e5e5e5">
  <div style="text-align:center">
    <div style="font-size:3rem;margin-bottom:1rem">${result.status === "already_approved" ? "&#9989;" : "&#9989;"}</div>
    <h1 style="font-size:1.5rem;font-weight:700">${message}</h1>
    <p style="color:#737373;margin-top:0.5rem">This agent can now use the Anban API.</p>
  </div>
</body></html>`,
      { headers: { "Content-Type": "text/html" } },
    );
  } catch (err) {
    return new Response(
      `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Approval Failed</title></head>
<body style="display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;font-family:sans-serif;background:#0a0a0a;color:#e5e5e5">
  <div style="text-align:center">
    <div style="font-size:3rem;margin-bottom:1rem">&#10060;</div>
    <h1 style="font-size:1.5rem;font-weight:700">Approval failed</h1>
    <p style="color:#737373;margin-top:0.5rem">The approval link is invalid or has expired.</p>
  </div>
</body></html>`,
      { headers: { "Content-Type": "text/html" }, status: 400 },
    );
  }
}
