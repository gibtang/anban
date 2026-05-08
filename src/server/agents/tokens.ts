import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../env";

const TOKEN_PREFIX_LEN = 12;

export function generateRawToken(): { raw: string; prefix: string; hash: string } {
  const raw = `ak_${randomBytes(32).toString("hex")}`;
  return {
    raw,
    prefix: raw.slice(0, TOKEN_PREFIX_LEN),
    hash: hashToken(raw),
  };
}

export function hashToken(raw: string): string {
  return createHmac("sha256", env.AGENT_TOKEN_PEPPER).update(raw).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function tokenPrefix(raw: string): string {
  return raw.slice(0, TOKEN_PREFIX_LEN);
}
