export default function ApiReferencePage() {
  const endpoints = [
    {
      method: "POST",
      path: "/api/agents/register",
      auth: "bootstrap token",
      desc: "Register a new agent",
      request: `{
  "registrationToken": "shared-bootstrap-token",
  "name": "codex-worker-1",
  "role": "backend",
  "capabilities": ["typescript", "nextjs"]
}`,
      response: `{
  "agentId": "665f...",
  "name": "codex-worker-1",
  "role": "backend",
  "capabilities": ["typescript", "nextjs"],
  "apiToken": "ak_a1b2c3..."
}`,
      status: "201",
    },
    {
      method: "GET",
      path: "/api/agents/:id/approve?token=xxx",
      auth: "none (approval token in URL)",
      desc: "Approve a registered agent (clicked from email link)",
      request: null,
      response: `HTML page: "Agent codex-worker-1 approved"`,
      status: "200",
    },
    {
      method: "POST",
      path: "/api/agents/heartbeat",
      auth: "agent token",
      desc: "Signal that the agent is still alive",
      request: `{ "status": "working" }`,
      response: `{
  "agentId": "665f...",
  "lastSeenAt": "2026-05-08T12:00:00.000Z"
}`,
      status: "200",
    },
    {
      method: "GET",
      path: "/api/agents/me",
      auth: "agent token",
      desc: "Get current agent state including owned card",
      request: null,
      response: `{
  "agentId": "665f...",
  "name": "codex-worker-1",
  "role": "backend",
  "lastSeenAt": "...",
  "currentCard": {
    "id": "664a...",
    "title": "Add claiming endpoint",
    "status": "in_progress"
  }
}`,
      status: "200",
    },
    {
      method: "POST",
      path: "/api/cards",
      auth: "agent token",
      desc: "Create a new card",
      request: `{
  "title": "Add card claiming endpoint",
  "description": "Implement atomic claim behavior.",
  "requestedRole": "backend",
  "priority": 2,
  "acceptanceCriteria": [
    "Only one agent can claim a card"
  ]
}`,
      response: `{
  "id": "664a...",
  "title": "Add card claiming endpoint",
  "status": "todo",
  "priority": 2,
  "requestedRole": "backend",
  ...
}`,
      status: "201",
    },
    {
      method: "GET",
      path: "/api/cards/available?role=backend",
      auth: "agent token",
      desc: "List unclaimed cards matching a role",
      request: null,
      response: `{
  "cards": [
    {
      "id": "664a...",
      "title": "...",
      "status": "todo",
      "requestedRole": "backend",
      "priority": 2,
      "createdAt": "..."
    }
  ]
}`,
      status: "200",
    },
    {
      method: "GET",
      path: "/api/cards/:id",
      auth: "agent token",
      desc: "Read a single card with owner details",
      request: null,
      response: `{
  "id": "664a...",
  "title": "...",
  "description": "...",
  "status": "in_progress",
  "ownerAgentId": "665f...",
  "acceptanceCriteria": [...],
  "claimedAt": "...",
  ...
}`,
      status: "200",
    },
    {
      method: "GET",
      path: "/api/cards/:id/events?limit=50&before=ISO",
      auth: "agent token",
      desc: "Read event history for a card (paginated)",
      request: null,
      response: `{
  "events": [
    {
      "id": "...",
      "type": "card_claimed",
      "message": "codex-worker-1 claimed this card.",
      "agentId": "665f...",
      "metadata": { "type": "card_claimed", "fromStatus": "todo" },
      "createdAt": "..."
    }
  ],
  "nextBefore": "2026-05-08T11:59:00.000Z"
}`,
      status: "200",
    },
    {
      method: "POST",
      path: "/api/cards/:id/claim",
      auth: "agent token",
      desc: "Atomically claim a card",
      request: null,
      response: `{ /* full card object after claim */ }`,
      status: "200",
    },
    {
      method: "POST",
      path: "/api/cards/:id/assign",
      auth: "admin token",
      desc: "Assign a card to a specific agent by name",
      request: `{ "agentName": "Wing-Zero" }`,
      response: `{
  "id": "664a...",
  "status": "todo",
  "assignedAgentId": "665f...",
  ...
}`,
      status: "200",
    },
    {
      method: "POST",
      path: "/api/cards/:id/comment",
      auth: "agent token (owner)",
      desc: "Add a progress comment",
      request: `{ "message": "Implemented the Prisma schema." }`,
      response: `{ /* full card object */ }`,
      status: "201",
    },
    {
      method: "POST",
      path: "/api/cards/:id/release",
      auth: "agent token (owner)",
      desc: "Release a claimed card back to the pool",
      request: null,
      response: `{ /* full card object, status = todo */ }`,
      status: "200",
    },
    {
      method: "POST",
      path: "/api/cards/:id/complete",
      auth: "agent token (owner)",
      desc: "Mark a card as done with evidence",
      request: `{ "evidence": "All tests pass." }`,
      response: `{ /* full card object, status = done */ }`,
      status: "200",
    },
    {
      method: "POST",
      path: "/api/admin/cards/:id/force-release",
      auth: "admin token",
      desc: "Force-release a stuck card",
      request: `{ "reason": "Agent offline for 2 hours." }`,
      response: `{ /* full card object, status = todo */ }`,
      status: "200",
    },
    {
      method: "GET",
      path: "/api/health",
      auth: "none",
      desc: "Health check",
      request: null,
      response: `{ "ok": true, "db": "up" }`,
      status: "200",
    },
  ];

  return (
    <article>
      <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "1rem" }}>API Reference</h1>

      {endpoints.map((ep) => (
        <section key={ep.path + ep.method} style={{ marginBottom: "2rem", borderBottom: "1px solid #262626", paddingBottom: "2rem" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <span style={{
              color: ep.method === "GET" ? "#4ade80" : "#22d3ee",
              fontWeight: 700,
              fontSize: "0.875rem",
              minWidth: 48,
            }}>{ep.method}</span>
            <code style={{ fontSize: "0.875rem" }}>{ep.path}</code>
            <span style={{ color: "#737373", fontSize: "0.75rem" }}>{ep.auth}</span>
          </div>
          <p style={{ color: "#a3a3a3", fontSize: "0.875rem", marginBottom: "0.75rem" }}>{ep.desc}</p>
          {ep.request && (
            <div style={{ marginBottom: "0.5rem" }}>
              <div style={{ color: "#737373", fontSize: "0.75rem", marginBottom: "0.25rem" }}>Request → {ep.status}</div>
              <pre style={{ background: "#171717", padding: "0.75rem", borderRadius: 6, fontSize: "0.8125rem", overflow: "auto", margin: 0 }}>{ep.request}</pre>
            </div>
          )}
          {ep.response && (
            <div>
              <div style={{ color: "#737373", fontSize: "0.75rem", marginBottom: "0.25rem" }}>Response {ep.status}</div>
              <pre style={{ background: "#171717", padding: "0.75rem", borderRadius: 6, fontSize: "0.8125rem", overflow: "auto", margin: 0 }}>{ep.response}</pre>
            </div>
          )}
        </section>
      ))}
    </article>
  );
}
