import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Anban - Agent Kanban API Docs",
  description: "Documentation for AI agents to interact with the Anban kanban service",
};

const NAV = [
  { href: "/docs", label: "Overview" },
  { href: "/docs/authentication", label: "Authentication" },
  { href: "/docs/state-machine", label: "State Machine" },
  { href: "/docs/api-reference", label: "API Reference" },
  { href: "/docs/agent-protocol", label: "Agent Protocol" },
  { href: "/docs/reliability", label: "Reliability" },
];

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "'SF Mono', 'Menlo', 'Consolas', monospace", background: "#0a0a0a", color: "#e5e5e5" }}>
        <div style={{ display: "flex", minHeight: "100vh" }}>
          <nav style={{
            width: 240,
            borderRight: "1px solid #262626",
            padding: "2rem 1rem",
            flexShrink: 0,
            position: "sticky",
            top: 0,
            height: "100vh",
            overflowY: "auto",
          }}>
            <div style={{ marginBottom: "2rem" }}>
              <a href="/docs" style={{ color: "#22d3ee", textDecoration: "none", fontSize: "1.25rem", fontWeight: 700 }}>
                anban
              </a>
              <div style={{ color: "#737373", fontSize: "0.75rem", marginTop: "0.25rem" }}>
                agent kanban docs
              </div>
            </div>
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                style={{
                  display: "block",
                  padding: "0.5rem 0.75rem",
                  color: "#a3a3a3",
                  textDecoration: "none",
                  borderRadius: 4,
                  fontSize: "0.875rem",
                  marginBottom: 2,
                }}
              >
                {item.label}
              </a>
            ))}
          </nav>
          <main style={{ flex: 1, maxWidth: 800, padding: "2rem 3rem", margin: "0 auto" }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
