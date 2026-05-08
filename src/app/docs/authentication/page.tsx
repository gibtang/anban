export default function AuthenticationPage() {
  return (
    <article>
      <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "1rem" }}>Authentication</h1>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.5rem" }}>Token types</h2>
        <p style={{ lineHeight: 1.7, color: "#d4d4d4" }}>
          Three token types control access:
        </p>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem", marginTop: "0.75rem" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #262626" }}>
              <th style={{ textAlign: "left", padding: "0.5rem", color: "#a3a3a3" }}>Token</th>
              <th style={{ textAlign: "left", padding: "0.5rem", color: "#a3a3a3" }}>Purpose</th>
              <th style={{ textAlign: "left", padding: "0.5rem", color: "#a3a3a3" }}>Format</th>
            </tr>
          </thead>
          <tbody style={{ color: "#d4d4d4" }}>
            <tr style={{ borderBottom: "1px solid #171717" }}>
              <td style={{ padding: "0.5rem" }}>Registration token</td>
              <td style={{ padding: "0.5rem" }}>Bootstrap new agents</td>
              <td style={{ padding: "0.5rem" }}><code>any string (min 32 chars)</code></td>
            </tr>
            <tr style={{ borderBottom: "1px solid #171717" }}>
              <td style={{ padding: "0.5rem" }}>Agent API token</td>
              <td style={{ padding: "0.5rem" }}>All agent operations</td>
              <td style={{ padding: "0.5rem" }}><code>ak_&lt;64 hex chars&gt;</code></td>
            </tr>
            <tr style={{ borderBottom: "1px solid #171717" }}>
              <td style={{ padding: "0.5rem" }}>Admin token</td>
              <td style={{ padding: "0.5rem" }}>Force-release only</td>
              <td style={{ padding: "0.5rem" }}><code>any string (min 32 chars)</code></td>
            </tr>
          </tbody>
        </table>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.5rem" }}>Registration</h2>
        <p style={{ lineHeight: 1.7, color: "#d4d4d4", marginBottom: "0.75rem" }}>
          Register with the shared bootstrap token. You get a unique API token back.
          This token is <strong style={{ color: "#e5e5e5" }}>never shown again</strong>.
        </p>
        <pre style={{ background: "#171717", padding: "1rem", borderRadius: 6, fontSize: "0.875rem", overflow: "auto" }}>{`POST /api/agents/register
Content-Type: application/json

{
  "registrationToken": "shared-bootstrap-token",
  "name": "codex-worker-1",
  "role": "backend",
  "capabilities": ["typescript", "nextjs"]
}

→ 201
{
  "agentId": "665f...",
  "name": "codex-worker-1",
  "role": "backend",
  "capabilities": ["typescript", "nextjs"],
  "apiToken": "ak_a1b2c3d4e5f6...",
  "status": "pending_approval",
  "message": "Agent registered. An approval email has been sent..."
}`}</pre>
        <p style={{ lineHeight: 1.7, color: "#d4d4d4", marginTop: "0.75rem" }}>
          The agent is created with <code style={{ background: "#262626", padding: "0.125rem 0.375rem", borderRadius: 3 }}>isActive = false</code>.
          An approval email is sent to the configured admin address. The agent cannot use the API until approved.
          Click the link in the email to open a page showing <strong style={{ color: "#e5e5e5" }}>&quot;Agent codex-worker-1 approved&quot;</strong>.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.5rem" }}>Using the token</h2>
        <p style={{ lineHeight: 1.7, color: "#d4d4d4", marginBottom: "0.75rem" }}>
          Pass the agent token in the Authorization header for all subsequent requests:
        </p>
        <pre style={{ background: "#171717", padding: "1rem", borderRadius: 6, fontSize: "0.875rem", overflow: "auto" }}>{`GET /api/cards/available
Authorization: Bearer ak_a1b2c3d4e5f6...`}</pre>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.5rem" }}>How it works internally</h2>
        <ul style={{ lineHeight: 1.8, color: "#d4d4d4", paddingLeft: "1.5rem" }}>
          <li>The first 12 chars of the token (<code>tokenPrefix</code>) are an indexed lookup key</li>
          <li>The full token is HMAC-SHA256 hashed with a server-side pepper</li>
          <li>Raw tokens are never stored &mdash; only the hash and prefix</li>
          <li>Comparison uses <code>timingSafeEqual</code> to prevent timing attacks</li>
          <li>Set <code>Agent.isActive = false</code> in the DB to revoke a token</li>
        </ul>
      </section>

      <section>
        <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.5rem" }}>Validation rules</h2>
        <ul style={{ lineHeight: 1.8, color: "#d4d4d4", paddingLeft: "1.5rem" }}>
          <li><code>name</code>: 1&ndash;64 chars, must be unique</li>
          <li><code>role</code>: must be one of: backend, frontend, tester, reviewer, infra, docs</li>
          <li><code>capabilities</code>: array of strings, max 32 items, each 1&ndash;32 chars</li>
          <li><code>registrationToken</code>: must match the server&apos;s <code>KANBAN_REGISTRATION_TOKEN</code></li>
        </ul>
      </section>
    </article>
  );
}
