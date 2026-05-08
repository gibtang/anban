# Headless Agent Kanban MVP Implementation

## Goal

Build a headless kanban service that lets AI agents coordinate work, claim tasks, leave durable context, and hand work to another agent role. The MVP exposes an HTTP API only. A visual board can be added later, but the system must be useful without a UI.

The done criteria is a real concurrency test: two independently-registered agents must be able to race for the same card and produce exactly one successful claim.

## Stack

- Next.js 15 (App Router) for API route handlers.
- Prisma ORM with the MongoDB connector.
- MongoDB (Atlas free tier or a local replica set — transactions require a replica set).
- Zod for request validation.
- Per-agent API tokens (HMAC-hashed) for authentication.
- Vitest for unit and integration tests.
- TypeScript strict mode throughout.

## MVP Scope

One shared board. Agents, cards, and an append-only event log per card.

Included:

- Register agent, heartbeat, and recover owned card on restart.
- Create cards.
- List available cards filtered by agent role.
- Claim a card atomically.
- Add progress comments.
- Mark a card blocked, and unblock back to `todo`.
- Hand off a card to another role with structured handoff context.
- Complete a card with evidence.
- Read a card and its event history.
- Release (unclaim) a card the agent currently owns, and admin force-release for stale claims.

Excluded for the MVP:

- Drag-and-drop UI.
- Realtime subscriptions.
- Multi-board support.
- Notifications and webhooks.
- Dependency graphs and parent/child cards.
- Artifact file storage.
- Complex permissions and role-based authorization beyond `requestedRole` matching.
- A separate MCP server (the HTTP API is the boundary; an MCP wrapper is a follow-up project).
- Long-running agent execution inside Next.js.

## Card State Machine

```ts
// src/server/cards/cardStatus.ts
export const CARD_STATUSES = [
  "todo",
  "in_progress",
  "blocked",
  "handoff",
  "done",
] as const;

export type CardStatus = (typeof CARD_STATUSES)[number];

export const VALID_TRANSITIONS: Record<CardStatus, CardStatus[]> = {
  todo:        ["in_progress", "blocked"],
  in_progress: ["blocked", "handoff", "done", "todo"], // todo = release
  blocked:     ["todo", "handoff"],
  handoff:     ["in_progress", "blocked"],
  done:        [],
};

export function assertTransition(from: CardStatus, to: CardStatus): void {
  if (!VALID_TRANSITIONS[from].includes(to)) {
    throw new InvalidStateTransitionError(
      `Cannot transition card from ${from} to ${to}`
    );
  }
}
```

Transitions in plain English:

```txt
todo         -> in_progress (claim)
todo         -> blocked     (block)
in_progress  -> blocked     (block)
in_progress  -> handoff     (handoff)
in_progress  -> done        (complete)
in_progress  -> todo        (release / unclaim)
blocked      -> todo        (unblock)
blocked      -> handoff     (handoff while blocked)
handoff      -> in_progress (next role claims)
handoff      -> blocked     (block during handoff)
done         -> (terminal in MVP)
```

## Roles

For the MVP, `requestedRole` and `Agent.role` are free-form strings, but the registration and create-card endpoints validate against an allowlist held in a single source of truth so it can be expanded easily.

```ts
// src/server/roles.ts
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
```

If the user wants to add a role later, edit one file. Cards may also have `requestedRole = null`, meaning any agent can claim them.

## Authorization Rules

Every card mutation (except create and claim) requires the requesting agent to be the current `ownerAgentId`. Claims are the exception because ownership is established by the claim itself.

```txt
POST /api/cards              -> any authenticated agent
GET  /api/cards/available    -> any authenticated agent
GET  /api/cards/:id          -> any authenticated agent
GET  /api/cards/:id/events   -> any authenticated agent
POST /api/cards/:id/claim    -> any authenticated agent (role must match requestedRole)
POST /api/cards/:id/comment  -> owner only (status must be in_progress)
POST /api/cards/:id/block    -> owner only (status must be in_progress)
POST /api/cards/:id/unblock  -> owner only (status must be blocked)
POST /api/cards/:id/handoff  -> owner only (status must be in_progress or blocked)
POST /api/cards/:id/release  -> owner only (status must be in_progress)
POST /api/cards/:id/complete -> owner only (status must be in_progress)
POST /api/admin/cards/:id/force-release -> admin token only
```

Owner check in service layer — enforced via `updateMany` with ownership in the `where` clause rather than a separate read+guard:

```ts
// Example: complete only succeeds if ownerAgentId matches
const result = await prisma.card.updateMany({
  where: { id: cardId, ownerAgentId: agent.id, status: "in_progress" },
  data:  { status: "done", completedAt: new Date() },
});
if (result.count !== 1) throw new ConflictError("Card is not in a completable state");
```

This makes every transition both ownership-guarded and race-safe.

## Prisma MongoDB Schema

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}

enum CardStatus {
  todo
  in_progress
  blocked
  handoff
  done
}

enum CardEventType {
  card_created
  card_claimed
  status_changed
  comment_added
  blocked
  unblocked
  handoff_requested
  released
  completed
}

enum AgentLiveStatus {
  idle
  working
  offline
}

model Agent {
  id            String           @id @default(auto()) @map("_id") @db.ObjectId
  name          String
  role          String
  capabilities  String[]
  tokenPrefix   String           @unique // first 12 chars of raw token, used for fast lookup
  tokenHash     String                    // full HMAC-SHA256 of raw token
  isActive      Boolean          @default(true)
  currentStatus AgentLiveStatus  @default(idle)
  currentCardId String?          @db.ObjectId
  lastSeenAt    DateTime?
  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt

  ownedCards    Card[]           @relation("OwnedCards")
  createdCards  Card[]           @relation("CreatedCards")
  events        CardEvent[]

  @@index([role, isActive])
  @@index([capabilities])
  @@index([currentCardId])
}

model Card {
  id                 String     @id @default(auto()) @map("_id") @db.ObjectId
  title              String
  description        String
  status             CardStatus @default(todo)
  priority           Int        @default(3)
  requestedRole      String?
  ownerAgentId       String?    @db.ObjectId
  ownerAgent         Agent?     @relation("OwnedCards", fields: [ownerAgentId], references: [id])
  acceptanceCriteria String[]
  blockedReason      String?
  handoffSummary     String?
  createdByAgentId   String?    @db.ObjectId
  createdByAgent     Agent?     @relation("CreatedCards", fields: [createdByAgentId], references: [id])
  claimedAt          DateTime?
  completedAt        DateTime?
  createdAt          DateTime   @default(now())
  updatedAt          DateTime   @updatedAt

  events             CardEvent[]

  @@index([status, requestedRole, priority, createdAt])
  @@index([ownerAgentId, status])
}

model CardEvent {
  id        String        @id @default(auto()) @map("_id") @db.ObjectId
  cardId    String        @db.ObjectId
  card      Card          @relation(fields: [cardId], references: [id])
  agentId   String?       @db.ObjectId
  agent     Agent?        @relation(fields: [agentId], references: [id])
  type      CardEventType
  message   String
  metadata  Json?
  createdAt DateTime      @default(now())

  @@index([cardId, createdAt])
  @@index([agentId, createdAt])
  @@index([type, createdAt])
}
```

Key schema decisions:

- `tokenPrefix` is `@unique` so authentication is an indexed point lookup, not a scan.
- `tokenHash` stores the HMAC-SHA256 result; raw tokens are never persisted.
- `AgentLiveStatus` is an enum so heartbeat values are bounded.
- A new `released` event type makes voluntary unclaim auditable. `unblocked` similarly.
- `CardEvent.metadata` is the structured-payload escape hatch (handoff context, claim race winner, etc.).

## CardEvent.metadata Contracts

The `metadata` field is `Json?` and varies by event type. Each writer must populate it as follows:

```ts
// src/server/cards/eventMetadata.ts
export type EventMetadata =
  | { type: "card_created";       requestedRole: string | null; priority: number }
  | { type: "card_claimed";       fromStatus: CardStatus }
  | { type: "status_changed";     from: CardStatus; to: CardStatus }
  | { type: "comment_added" }
  | { type: "blocked";            reason: string }
  | { type: "unblocked" }
  | { type: "handoff_requested";  toRole: string;
                                  completedWork: string[];
                                  remainingWork: string[];
                                  filesTouched: string[];
                                  blockers: string[];
                                  suggestedNextStep: string }
  | { type: "released";           reason: "voluntary" | "force" }
  | { type: "completed";          evidence: string };
```

The structured handoff payload lives in the event's `metadata`. `Card.handoffSummary` keeps just the human-readable summary string for quick reads.

## Environment

```env
# Required
DATABASE_URL="mongodb+srv://user:pass@cluster/agent_kanban?replicaSet=...&retryWrites=true&w=majority"
KANBAN_REGISTRATION_TOKEN="bootstrap-secret"          # min 32 chars
AGENT_TOKEN_PEPPER="long-random-secret"               # min 32 chars, never rotate without re-issuing all tokens
KANBAN_ADMIN_TOKEN="admin-only-secret"                # for force-release

# Optional
NODE_ENV="development"
LOG_LEVEL="info"
```

A `.env.example` must be committed with placeholders, and `.env` must be in `.gitignore`.

Validate environment at startup:

```ts
// src/server/env.ts
import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  KANBAN_REGISTRATION_TOKEN: z.string().min(32),
  AGENT_TOKEN_PEPPER: z.string().min(32),
  KANBAN_ADMIN_TOKEN: z.string().min(32),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export const env = EnvSchema.parse(process.env);
```

Import `env` at the top of `prisma.ts` so misconfiguration fails fast.

## Prisma Singleton

```ts
// src/server/prisma.ts
import { PrismaClient } from "@prisma/client";
import "./env";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}
```

## Authentication

Three token types:

```txt
KANBAN_REGISTRATION_TOKEN  - shared bootstrap secret, only for /api/agents/register
agent API token            - long-lived, one per agent, used for everything else
KANBAN_ADMIN_TOKEN         - separate admin secret, only for force-release
```

Token format and storage:

```ts
// src/server/agents/tokens.ts
import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../env";

const TOKEN_PREFIX_LEN = 12; // "ak_" + 9 hex chars

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
```

Authentication middleware:

```ts
// src/server/agents/auth.ts
import { prisma } from "../prisma";
import { hashToken, safeEqual, tokenPrefix } from "./tokens";
import { UnauthorizedError } from "../errors";

export async function authenticateAgent(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing bearer token");
  }
  const raw = authHeader.slice("Bearer ".length).trim();
  if (!raw.startsWith("ak_")) throw new UnauthorizedError("Invalid token format");

  const prefix = tokenPrefix(raw);
  const agent = await prisma.agent.findUnique({ where: { tokenPrefix: prefix } });
  if (!agent || !agent.isActive) throw new UnauthorizedError("Invalid token");

  const candidateHash = hashToken(raw);
  if (!safeEqual(candidateHash, agent.tokenHash)) {
    throw new UnauthorizedError("Invalid token");
  }
  return agent;
}
```

`tokenPrefix` makes lookup an indexed equality query; `timingSafeEqual` on the hash prevents timing attacks across same-prefix collisions (vanishingly rare but free to defend).

## Error Model

```ts
// src/server/errors.ts
export class AppError extends Error {
  constructor(public code: string, message: string, public status: number) {
    super(message);
  }
}
export class UnauthorizedError extends AppError {
  constructor(msg = "Unauthorized") { super("unauthorized", msg, 401); }
}
export class ForbiddenError extends AppError {
  constructor(msg = "Forbidden") { super("forbidden", msg, 403); }
}
export class NotFoundError extends AppError {
  constructor(msg = "Not found") { super("not_found", msg, 404); }
}
export class ConflictError extends AppError {
  constructor(msg: string) { super("conflict", msg, 409); }
}
export class ValidationError extends AppError {
  constructor(msg: string, public details?: unknown) { super("validation_error", msg, 400); }
}
export class InvalidStateTransitionError extends ConflictError {
  constructor(msg: string) { super(msg); this.code = "invalid_state_transition"; }
}
```

Standard error envelope:

```json
{ "error": { "code": "conflict", "message": "Card is not available to claim" } }
```

A single helper turns a thrown error into a `Response`:

```ts
// src/server/http.ts
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError, ValidationError } from "./errors";

export function errorResponse(err: unknown): NextResponse {
  if (err instanceof ZodError) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "Invalid request body", details: err.flatten() } },
      { status: 400 },
    );
  }
  if (err instanceof AppError) {
    return NextResponse.json(
      { error: { code: err.code, message: err.message, ...(err instanceof ValidationError && err.details ? { details: err.details } : {}) } },
      { status: err.status },
    );
  }
  console.error("Unhandled error", err);
  return NextResponse.json({ error: { code: "internal_error", message: "Internal error" } }, { status: 500 });
}

export function ok<T>(body: T, status = 200) {
  return NextResponse.json(body, { status });
}
```

## API Surface

All agent requests use `Authorization: Bearer <agent-token>` unless noted. Force-release uses `Authorization: Bearer <admin-token>`.

```txt
POST   /api/agents/register                      # bootstrap token
POST   /api/agents/heartbeat                     # agent token
GET    /api/agents/me                            # agent token; includes currentCard
POST   /api/cards                                # agent token
GET    /api/cards/available?role=backend         # agent token; role optional, defaults to caller's role
GET    /api/cards/:id                            # agent token
GET    /api/cards/:id/events?limit=50&before=ISO # agent token; paginated
POST   /api/cards/:id/claim                      # agent token
POST   /api/cards/:id/comment                    # agent token; must be owner
POST   /api/cards/:id/block                      # agent token; must be owner
POST   /api/cards/:id/unblock                    # agent token; must be owner
POST   /api/cards/:id/handoff                    # agent token; must be owner
POST   /api/cards/:id/release                    # agent token; must be owner
POST   /api/cards/:id/complete                   # agent token; must be owner
POST   /api/admin/cards/:id/force-release        # admin token only
GET    /api/health                               # no auth
```

## Request and Response Contracts

All payloads validated with Zod. All responses are JSON.

### `POST /api/agents/register`

Request:
```json
{
  "registrationToken": "shared-bootstrap-token",
  "name": "codex-worker-1",
  "role": "backend",
  "capabilities": ["typescript", "nextjs", "prisma", "testing"]
}
```

Response `201`:
```json
{
  "agentId": "665f...",
  "name": "codex-worker-1",
  "role": "backend",
  "capabilities": ["typescript", "nextjs", "prisma", "testing"],
  "apiToken": "ak_live_xxx"
}
```

`apiToken` is returned exactly once. The server stores `tokenHash` and `tokenPrefix`.

Validation: `role` must be in `KNOWN_ROLES`; `name` 1–64 chars; `capabilities` array of strings, max 32 items, each 1–32 chars.

### `POST /api/agents/heartbeat`

Request:
```json
{ "status": "idle", "currentCardId": null }
```

Response `200`:
```json
{ "agentId": "665f...", "lastSeenAt": "2026-05-08T12:00:00.000Z" }
```

`status` must be `idle | working | offline`. `currentCardId` may be `null` or an ObjectId string. The server does NOT validate that the agent actually owns the referenced card — heartbeat is informational.

### `GET /api/agents/me`

Response `200`:
```json
{
  "agentId": "665f...",
  "name": "codex-worker-1",
  "role": "backend",
  "currentStatus": "working",
  "currentCard": { "id": "664a...", "title": "...", "status": "in_progress" },
  "lastSeenAt": "..."
}
```

Used on agent restart to recover state. `currentCard` is computed from `Card.ownerAgentId == agent.id AND status IN (in_progress, handoff, blocked)` — the source of truth is the card, not `Agent.currentCardId`.

### `POST /api/cards`

Request:
```json
{
  "title": "Add card claiming endpoint",
  "description": "Implement atomic claim behavior for available cards.",
  "requestedRole": "backend",
  "priority": 2,
  "acceptanceCriteria": [
    "Only one agent can claim a card",
    "Claim creates a card_claimed event"
  ]
}
```

Validation: `title` 1–200 chars; `description` 1–10000 chars; `requestedRole` null or in `KNOWN_ROLES`; `priority` 1–5 (1 highest); `acceptanceCriteria` 0–20 items, each 1–500 chars.

Response `201`: full card object (see GET below). Also writes a `card_created` event with `createdByAgentId = caller.id`.

### `GET /api/cards/available?role=backend`

Returns up to 50 cards where:
- `ownerAgentId == null`
- `status IN (todo, handoff)`
- `requestedRole == role` OR `requestedRole == null`

Sort: `priority ASC, createdAt ASC`. If `role` query param is omitted, default to caller's `agent.role`.

Response `200`:
```json
{
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
}
```

### `GET /api/cards/:id`

Response `200`: full card object.
```json
{
  "id": "664a...",
  "title": "...",
  "description": "...",
  "status": "in_progress",
  "priority": 2,
  "requestedRole": "backend",
  "ownerAgentId": "665f...",
  "ownerAgent": { "id": "665f...", "name": "codex-worker-1", "role": "backend" },
  "acceptanceCriteria": ["..."],
  "blockedReason": null,
  "handoffSummary": null,
  "createdByAgentId": "665e...",
  "claimedAt": "...",
  "completedAt": null,
  "createdAt": "...",
  "updatedAt": "..."
}
```

`404` if not found.

### `GET /api/cards/:id/events?limit=50&before=<iso>`

Response `200`:
```json
{
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
}
```

`limit` 1–100, default 50. `before` is an ISO timestamp; events with `createdAt < before` are returned, newest first.

### `POST /api/cards/:id/claim`

No body. Response `200`: full card object after claim.
- `409 conflict` if not claimable.

### `POST /api/cards/:id/comment`

Request:
```json
{ "message": "Implemented the Prisma schema." }
```

Validation: 1–4000 chars. Caller must be `ownerAgentId`. Response `201`: the new event.

### `POST /api/cards/:id/block`

Request:
```json
{ "reason": "Missing expected response contract for the agent runtime." }
```

Caller must be owner. Status must be `in_progress`. Validation: `reason` 1–2000 chars.

Response `200`: card object after block. Sets `status = blocked`, `blockedReason = reason`. Emits `blocked` event.

### `POST /api/cards/:id/unblock`

No body. Caller must be owner. Status must be `blocked`. Sets `status = todo`, `blockedReason = null`, `ownerAgentId = null`, `claimedAt = null` — unblocking returns the card to the pool. Emits `unblocked` event.

(Rationale: an agent that blocked a card may not be the right one to resume. Unblocking returns it to the queue.)

### `POST /api/cards/:id/handoff`

Request:
```json
{
  "toRole": "tester",
  "summary": "Backend endpoint is complete and needs integration tests.",
  "completedWork": ["Added claim service", "Added API route"],
  "remainingWork": ["Write success and conflict tests"],
  "filesTouched": ["src/server/cards.ts"],
  "blockers": [],
  "suggestedNextStep": "Test competing claim requests."
}
```

Validation: `toRole` in `KNOWN_ROLES` and not equal to caller's role; `summary` 1–2000 chars; arrays max 50 items, each 1–500 chars.

Caller must be owner. Status must be `in_progress` or `blocked`. Sets `status = handoff`, `requestedRole = toRole`, `ownerAgentId = null`, `claimedAt = null`, `handoffSummary = summary`. Emits `handoff_requested` with full structured metadata.

### `POST /api/cards/:id/release`

No body. Caller must be owner. Status must be `in_progress`. Returns card to pool: `status = todo`, `ownerAgentId = null`, `claimedAt = null`. Emits `released` with `reason: "voluntary"`.

### `POST /api/cards/:id/complete`

Request:
```json
{ "evidence": "Tests pass for card service and API route handlers." }
```

Validation: `evidence` 1–4000 chars. Caller must be owner. Status must be `in_progress`. Sets `status = done`, `completedAt = now()`. Emits `completed`.

### `POST /api/admin/cards/:id/force-release`

Admin-only (uses `KANBAN_ADMIN_TOKEN`). Request:
```json
{ "reason": "Agent codex-worker-1 has been offline for 2 hours." }
```

Resets card to `todo`, clears `ownerAgentId` and `claimedAt`, emits `released` event with `reason: "force"`. Allowed from any non-terminal status.

### `GET /api/health`

Response `200`: `{ "ok": true, "db": "up" }` after a `prisma.$runCommandRaw({ ping: 1 })`.

## Atomic Claiming

The claim service is the one piece of code that absolutely must be correct.

```ts
// src/server/cards/cardService.ts
export async function claimCard(agent: Agent, cardId: string) {
  const result = await prisma.card.updateMany({
    where: {
      id: cardId,
      ownerAgentId: null,
      status: { in: ["todo", "handoff"] },
      OR: [{ requestedRole: null }, { requestedRole: agent.role }],
    },
    data: {
      status: "in_progress",
      ownerAgentId: agent.id,
      claimedAt: new Date(),
      blockedReason: null,
    },
  });

  if (result.count !== 1) {
    // Distinguish "doesn't exist" from "not claimable" for a better error message.
    const existing = await prisma.card.findUnique({ where: { id: cardId } });
    if (!existing) throw new NotFoundError("Card not found");
    throw new ConflictError("Card is not available to claim");
  }

  // Best-effort event write. If this fails the claim still happened; log loudly.
  try {
    await prisma.cardEvent.create({
      data: {
        cardId,
        agentId: agent.id,
        type: "card_claimed",
        message: `${agent.name} claimed this card.`,
        metadata: { type: "card_claimed", fromStatus: "todo" },
      },
    });
  } catch (err) {
    console.error("Failed to write card_claimed event", { cardId, agentId: agent.id, err });
  }

  return prisma.card.findUniqueOrThrow({ where: { id: cardId } });
}
```

**Important Prisma + MongoDB note**: Prisma's MongoDB connector does **not** support interactive transactions (`prisma.$transaction(async tx => {...})`). It does support sequential transactions (`prisma.$transaction([...])`), but those don't help here because we need the result of the conditional update before deciding to write the event. The pattern above is therefore: do the conditional `updateMany` first; if it succeeds, write the event in a separate call and log on failure. The card update is the source of truth; missing events are recoverable from `Card.claimedAt` and `Card.ownerAgentId`.

For other state changes (block, complete, etc.) the same pattern applies: a conditional `updateMany` that asserts both the expected current state AND ownership, followed by a separate event write.

Example for `complete`:

```ts
const result = await prisma.card.updateMany({
  where: { id: cardId, ownerAgentId: agent.id, status: "in_progress" },
  data:  { status: "done", completedAt: new Date() },
});
if (result.count !== 1) throw new ConflictError("Card is not in a completable state");
```

This makes every transition both ownership-guarded and race-safe.

## Service Layer Layout

```txt
src/
  server/
    env.ts
    prisma.ts
    errors.ts
    http.ts
    roles.ts
    agents/
      tokens.ts
      auth.ts
      agentSchemas.ts
      agentService.ts
    cards/
      cardStatus.ts
      cardSchemas.ts
      cardService.ts
      eventMetadata.ts
  app/
    api/
      health/route.ts
      agents/
        register/route.ts
        heartbeat/route.ts
        me/route.ts
      cards/
        route.ts                  # POST create
        available/route.ts        # GET list
        [id]/
          route.ts                # GET card
          events/route.ts         # GET events
          claim/route.ts
          comment/route.ts
          block/route.ts
          unblock/route.ts
          handoff/route.ts
          release/route.ts
          complete/route.ts
      admin/
        cards/[id]/force-release/route.ts
```

Route handlers do four things only: extract auth, validate body with Zod, call a service function, format the response. No business logic in routes.

Example route handler shape:

```ts
// src/app/api/cards/[id]/claim/route.ts
import { authenticateAgent } from "@/server/agents/auth";
import { claimCard } from "@/server/cards/cardService";
import { errorResponse, ok } from "@/server/http";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const agent = await authenticateAgent(req.headers.get("authorization"));
    const { id } = await ctx.params;
    const card = await claimCard(agent, id);
    return ok(card);
  } catch (err) {
    return errorResponse(err);
  }
}
```

## Zod Schemas

```ts
// src/server/agents/agentSchemas.ts
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
  currentCardId: z.string().regex(/^[a-f0-9]{24}$/).nullable().optional(),
});

// src/server/cards/cardSchemas.ts
import { z } from "zod";
import { KNOWN_ROLES } from "../roles";

const ObjectIdString = z.string().regex(/^[a-f0-9]{24}$/);

export const CreateCardSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(10_000),
  requestedRole: z.enum(KNOWN_ROLES).nullable().optional(),
  priority: z.number().int().min(1).max(5).default(3),
  acceptanceCriteria: z.array(z.string().min(1).max(500)).max(20).default([]),
});

export const CommentSchema  = z.object({ message: z.string().min(1).max(4000) });
export const BlockSchema    = z.object({ reason: z.string().min(1).max(2000) });
export const CompleteSchema = z.object({ evidence: z.string().min(1).max(4000) });
export const HandoffSchema  = z.object({
  toRole: z.enum(KNOWN_ROLES),
  summary: z.string().min(1).max(2000),
  completedWork:    z.array(z.string().min(1).max(500)).max(50).default([]),
  remainingWork:    z.array(z.string().min(1).max(500)).max(50).default([]),
  filesTouched:     z.array(z.string().min(1).max(500)).max(50).default([]),
  blockers:         z.array(z.string().min(1).max(500)).max(50).default([]),
  suggestedNextStep: z.string().min(1).max(2000),
});

export const EventsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  before: z.string().datetime().optional(),
});

export const ForceReleaseSchema = z.object({ reason: z.string().min(1).max(2000) });
```

## Idempotency and Retries

- **Claim** is naturally idempotent: a second claim by the same agent on the same card returns `409 conflict` (because `ownerAgentId` is no longer null). Clients should treat 409 on claim as "someone got it; could be me" and immediately call `GET /api/cards/:id` to confirm ownership.
- **Comment, block, handoff, complete, release** are not idempotent. Clients should not retry on `5xx` blindly; they should re-fetch card state and decide what to do.
- A future enhancement is `Idempotency-Key` headers for these endpoints; out of scope for MVP.

## Stale Claims

The MVP does not include an automatic reaper. Operators detect stale claims by:

```ts
// any card where claimedAt is older than N minutes and status = "in_progress"
// and the owner's lastSeenAt is older than N minutes too
```

and call `POST /api/admin/cards/:id/force-release` manually. A scheduled reaper is a Phase 2 task.

## Agent Protocol

Agents interact with the board through the HTTP API. The board is a shared task memory and handoff ledger — agents do not browse or scrape a UI.

Operations in the MVP:

```txt
register self
heartbeat
recover state (GET /api/agents/me)
list available work
claim card
read card context + event history
post progress comments
block card (and unblock)
handoff card to another role
release card (voluntary unclaim)
complete card with evidence
```

### Agent Local Configuration

After registration, each agent stores:

```env
KANBAN_API_URL="http://localhost:3000"
KANBAN_AGENT_TOKEN="ak_live_xxx"
KANBAN_AGENT_ROLE="backend"
```

### Normal Agent Loop

```txt
1. heartbeat
2. GET /api/agents/me — recover any previously-owned card
3. if no owned card: list available work for my role
4. claim one card
5. read full card context and event history
6. do the work
7. post progress as card events
8. block, handoff, release, or complete
9. heartbeat again
```

### Example Client Usage

```ts
await kanban.heartbeat({ status: "idle" });

const me = await kanban.getMe();
if (me.currentCard) {
  // resume work on owned card
} else {
  const cards = await kanban.getAvailableCards({ role: "backend" });
  if (cards.length === 0) { /* no work; idle */ }
  const card = await kanban.claimCard({ cardId: cards[0].id });
}

const context = await kanban.getCard({ cardId: card.id });
const events = await kanban.getCardEvents({ cardId: card.id });

await kanban.comment({
  cardId: card.id,
  message: "Implemented the Prisma schema and claim service.",
});

await kanban.handoff({
  cardId: card.id,
  toRole: "tester",
  summary: "Claiming logic is ready for integration tests.",
  completedWork: ["Added card service", "Added atomic updateMany claim"],
  remainingWork: ["Test concurrent claims"],
  filesTouched: ["src/server/cards/cardService.ts"],
  blockers: [],
  suggestedNextStep: "Write the race-condition test.",
});
```

### Agent Behavior Rules

```txt
DO:
- claim before working
- heartbeat regularly
- recover state on restart via GET /api/agents/me
- post progress during long work
- handoff with enough context for the next agent
- block instead of spinning on something you can't fix
- complete only with evidence
- release if you can't finish (don't hold cards hostage)

DON'T:
- work on an unclaimed card
- claim multiple cards (one at a time)
- mark done without evidence
- handoff with vague notes
- overwrite another agent's ownership
- retry non-idempotent operations blindly on 5xx
```

### Codex-style Agent Instruction

```txt
On startup, call GET /api/agents/me to recover any previously-owned card.
If no owned card, call GET /api/cards/available for your role.
If a suitable card exists, claim it.
After claiming, read the card and event history.
During work, post meaningful progress comments.
If another role is needed, hand off the card with completed work, remaining work, files touched, blockers, and suggested next step.
If you cannot proceed, block the card with a reason.
If you need to stop entirely, release the card.
When finished, complete the card with evidence.
Heartbeat regularly to indicate you are still active.
```

## Testing Plan

Two test suites:

1. **Unit tests** (`*.test.ts`) — pure functions and service methods with a mocked Prisma client (`vitest-mock-extended`).
2. **Integration tests** (`*.integration.test.ts`) — real MongoDB, real Prisma, real HTTP via `next/server` route handlers invoked directly.

### Vitest config

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./test/setup.ts"],
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    testTimeout: 15_000,
    hookTimeout: 30_000,
  },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
```

### Integration test setup

`test/setup.ts` connects to a dedicated test database derived from `DATABASE_URL` (suffix `_test`) and truncates collections before each test:

```ts
// test/setup.ts
import { afterAll, beforeEach } from "vitest";
import { prisma } from "@/server/prisma";

beforeEach(async () => {
  await prisma.cardEvent.deleteMany({});
  await prisma.card.deleteMany({});
  await prisma.agent.deleteMany({});
});

afterAll(async () => {
  await prisma.$disconnect();
});
```

Tests that need a registered agent use a shared helper:

```ts
// test/factories.ts
export async function makeAgent(overrides: Partial<Parameters<typeof registerAgent>[0]> = {}) {
  return registerAgent({
    registrationToken: env.KANBAN_REGISTRATION_TOKEN,
    name: `test-agent-${randomUUID().slice(0, 6)}`,
    role: "backend",
    capabilities: [],
    ...overrides,
  });
}
```

### Required tests (write these first)

Authentication and registration:
- Registering with the correct bootstrap token creates an agent and returns a raw API token once.
- Registering with an invalid bootstrap token returns 401.
- Registering with an unknown `role` returns 400.
- Duplicate agent name returns 409.
- Authentication accepts a valid token; rejects expired/invalid; rejects inactive agents.
- Heartbeat updates `lastSeenAt`, `currentStatus`, and `currentCardId`.
- `GET /api/agents/me` returns currently-owned card after a claim.
- `GET /api/agents/me` returns no card when agent owns nothing.

Card lifecycle:
- Creating a card stores a `card_created` event with `createdByAgentId`.
- Card creation with no `requestedRole` allows any role to claim.
- Available cards exclude owned cards, completed cards, and role-mismatched cards.
- Available cards include `requestedRole = null` cards regardless of caller role.
- Claim succeeds for an unowned `todo` card matching the role.
- Claim succeeds for an unowned `handoff` card matching the new `requestedRole`.
- Claim fails with 409 when the card already has an owner.
- Claim fails with 409 when `requestedRole` does not match the agent's role.
- Comment requires ownership (non-owner gets 403).
- Comment rejects if card status is not `in_progress`.
- Block sets `status = blocked`, stores `blockedReason`, emits `blocked` event.
- Unblock returns card to pool with `status = todo` and clears owner.
- Handoff clears `ownerAgentId`, sets `status = handoff`, sets `requestedRole = toRole`, persists structured metadata in the event.
- Handoff with `toRole` equal to caller's role returns 400.
- Release returns card to pool from `in_progress` only.
- Release from non-`in_progress` state returns 409.
- Complete requires the current owner, sets `completedAt`, emits `completed`.
- Complete from any non-`in_progress` state returns 409.
- `done` cards are not listable as available and reject all transitions.
- Invalid status transitions return 409 with a descriptive message.
- Events endpoint paginates correctly with `before` cursor.
- Event history is ordered by `createdAt` descending (newest first).

Concurrency (the headline test):
- Two agents call claim on the same card via `Promise.all`. Exactly one succeeds; the other receives 409. Verified by:
  - exactly one `card_claimed` event exists after the dust settles;
  - `Card.ownerAgentId` is one of the two agents;
  - one HTTP response is 200 and the other is 409.

Sketch:

```ts
it("only one agent wins a claim race", async () => {
  const card = await createCard({ requestedRole: "backend", title: "x", description: "y" });
  const a1 = await makeAgent({ name: "a1" });
  const a2 = await makeAgent({ name: "a2" });

  const results = await Promise.allSettled([
    callClaim(card.id, a1.apiToken),
    callClaim(card.id, a2.apiToken),
  ]);

  const statuses = results.map(r => r.status === "fulfilled" ? r.value.status : -1).sort();
  expect(statuses).toEqual([200, 409]);

  const events = await prisma.cardEvent.findMany({
    where: { cardId: card.id, type: "card_claimed" },
  });
  expect(events).toHaveLength(1);
});
```

Run this 50 times in the test to catch rare interleavings:

```ts
it.each(Array.from({ length: 50 }, (_, i) => [i]))("claim race %i", async () => { /* ... */ });
```

Admin:
- Force-release by admin resets card to `todo` from any non-terminal status.
- Force-release by non-admin agent token returns 401.
- Force-release records `released` event with `reason: "force"`.

## Build Order

1. `npx create-next-app@latest agent-kanban --ts --app --eslint --src-dir --import-alias "@/*"` (no Tailwind needed).
2. `npm install prisma @prisma/client zod` and `npm install -D vitest vitest-mock-extended @types/node`.
3. `npx prisma init --datasource-provider mongodb`.
4. Write `prisma/schema.prisma` per this doc.
5. `npx prisma generate`.
6. Add `src/server/env.ts`, `src/server/prisma.ts`, `src/server/errors.ts`, `src/server/http.ts`, `src/server/roles.ts`.
7. Add `src/server/agents/tokens.ts` and `src/server/agents/auth.ts`.
8. Add `src/server/cards/cardStatus.ts` and `src/server/cards/eventMetadata.ts`.
9. Add Zod schemas in `agentSchemas.ts` and `cardSchemas.ts`.
10. Write `test/setup.ts`, `test/factories.ts`, and the failing test file for agent registration and heartbeat.
11. Implement `agentService.ts` to make those tests pass.
12. Write failing tests for card service (creation, available, claim happy path).
13. Implement card service `createCard`, `listAvailable`, `claimCard`.
14. Write failing tests for block/unblock/handoff/release/complete and ownership guards.
15. Implement those service methods.
16. Add the route handlers (one per endpoint).
17. Add route-level tests, including the claim race test running 50x in a loop.
18. Add `GET /api/health` and the admin force-release route.
19. Smoke-test by curling through the full agent loop with two terminal sessions.

## Done Criteria

The MVP is done when all of the following are true:

1. Two independent agents can register themselves using the bootstrap registration token and receive distinct API tokens.
2. Each authenticates future requests with `Authorization: Bearer <agent-token>`.
3. Both list the same available card.
4. They race to claim it concurrently.
5. Exactly one claim succeeds; the other receives `409 conflict`.
6. The winner posts at least one progress comment.
7. The winner hands the card off to a different role with a structured handoff payload.
8. An agent of the new role lists, sees, and claims the handed-off card.
9. That agent completes the card with evidence.
10. Either agent can read the full event history showing: `card_created`, `card_claimed`, `comment_added`, `handoff_requested`, `card_claimed` (second), `completed`.
11. The 50-iteration claim race test passes deterministically with no flakes.
12. The agent on restart can call `GET /api/agents/me` and recover its currently-owned card.
13. An admin can force-release a stuck card; a `released` event with `reason: "force"` is recorded.

## Out of Scope (explicit so it isn't accidentally added)

- MCP server wrapper.
- A scheduled stale-claim reaper.
- Webhooks or push notifications to agents.
- Rate limiting (add via middleware in a follow-up).
- Multi-tenant or multi-board.
- A web UI.
- Token rotation / revocation endpoints (for now: set `Agent.isActive = false` in the DB to revoke).

## Open Questions Resolved With Defaults

These are decisions made unilaterally; flag them if any should be different:

- **Roles are an enum, not free-form.** Easy to expand by editing `roles.ts`.
- **An agent may technically own multiple cards** (the schema doesn't forbid it), but the agent protocol requires "one at a time." Enforcement is a Phase 2 concern; the protocol covers it.
- **Unblock returns the card to the pool**, rather than to the previous owner. Rationale: blocked usually means the original owner can't proceed, so the next pickup may need a different agent.
- **No MCP wrapper in MVP.** The HTTP API is the boundary; an MCP server is a separate downstream package.
- **`completedAt` is set only on `complete`**, not on any other terminal-ish state.
- **Best-effort event writes after state changes**, with logging. Acceptable for MVP because the card itself remains the source of truth.
