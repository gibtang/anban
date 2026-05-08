import { z } from "zod";
import { KNOWN_ROLES } from "../roles";

export const RegisterAgentSchema = z.object({
  registrationToken: z.string().min(1),
  name: z.string().min(1).max(64),
  role: z.enum(KNOWN_ROLES),
  capabilities: z.array(z.string().min(1).max(32)).max(32).default([]),
});

export const HeartbeatSchema = z.object({
  status: z.enum(["idle", "working", "offline"]),
});
