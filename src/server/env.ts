import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  KANBAN_REGISTRATION_TOKEN: z.string().min(32),
  AGENT_TOKEN_PEPPER: z.string().min(32),
  KANBAN_ADMIN_TOKEN: z.string().min(32),
  RESEND_API_KEY: z.string().min(1).default("rebuild_later"),
  APPROVAL_BASE_URL: z.string().min(1).default("http://localhost:3000"),
  APPROVAL_EMAIL_TO: z.string().email().default("admin@example.com"),
  APPROVAL_EMAIL_FROM: z.string().email().default("noreply@example.com"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export const env = EnvSchema.parse(process.env);
