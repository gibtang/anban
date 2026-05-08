export const KNOWN_ROLES = [
  "backend",
  "frontend",
  "tester",
  "reviewer",
  "infra",
  "docs",
] as const;

export type Role = (typeof KNOWN_ROLES)[number];

export function isKnownRole(value: string): value is Role {
  return (KNOWN_ROLES as readonly string[]).includes(value);
}
