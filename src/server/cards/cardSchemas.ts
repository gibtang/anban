import { z } from "zod";
import { KNOWN_ROLES } from "../roles";

export const CreateCardSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(10_000),
  requestedRole: z.enum(KNOWN_ROLES).nullable().optional(),
  priority: z.number().int().min(1).max(5).default(3),
  acceptanceCriteria: z.array(z.string().min(1).max(500)).max(20).default([]),
});

export const CommentSchema = z.object({ message: z.string().min(1).max(4000) });
export const CompleteSchema = z.object({ evidence: z.string().min(1).max(4000) });
export const ForceReleaseSchema = z.object({ reason: z.string().min(1).max(2000) });

export const EventsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  before: z.string().datetime().optional(),
});
