import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  KANBAN_REGISTRATION_TOKEN: z.string().min(32),
  AGENT_TOKEN_PEPPER: z.string().min(32),
  KANBAN_ADMIN_TOKEN: z.string().min(32),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export const env = EnvSchema.parse(process.env);
