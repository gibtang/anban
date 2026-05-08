import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Anban - Agent Kanban",
  description: "Headless kanban service for AI agent coordination",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
