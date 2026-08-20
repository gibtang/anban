# Self-Service 401 Errors — Design

**Date:** 2026-08-20
**Status:** Approved

## Problem

When an Agent (LLM API client) calls the API with a missing, empty, or invalid
Bearer token — or a User's session cookie has expired — the API returns a bare
401 with a one-word or single-clause error. An agent receiving this has no way
to self-recover: it doesn't know where the onboarding/troubleshooting document
lives.

## Goal

Every API 401 response points the caller at the canonical skill.md
(`https://www.getanban.com/skill.md`) so agents can read it and troubleshoot
their own access issues.

## Decisions (from grill session)

1. **Scope** — API 401 responses only, on both Agent routes (`/api/agent/*`)
   and User routes (all other `/api/*`). HTML pages keep the existing
   client-side redirect to `/login`; a human needs a login button, not an
   agent-integration doc.
2. **Format** — enrich the `error` string itself. No structured field (e.g.
   `docsUrl`); the error string is the universal channel and nothing consumes
   a new field today.
3. **Implementation** — centralize in one helper rather than copy-pasting the
   message across ~43 catch sites. Non-trivial message content belongs in one
   module.

## Design

### Helper — `lib/auth/helpers.ts`

Two new exports, single source of truth for the 401 shape:

```ts
isUnauthorizedError(error: unknown): boolean
// error instanceof Error && error.message.startsWith('Unauthorized')

unauthorizedResponse(detail?: string): NextResponse
// detail present:  "Unauthorized: <detail>. Read the skill.md for API access
//                   and troubleshooting: https://www.getanban.com/skill.md"
// detail absent:   "Unauthorized. Read the skill.md for API access
//                   and troubleshooting: https://www.getanban.com/skill.md"
```

`unauthorizedResponse` strips a leading `Unauthorized:` (and whitespace) from
`detail`, so callers can pass the raw thrown message. Response is
`NextResponse.json({ error: message }, { status: 401 })`.

Existing throw sites are unchanged:

- `verifyAgentAuth` throws `Unauthorized: Missing Bearer token`,
  `Unauthorized: Empty token`, `Unauthorized: Invalid or revoked token`.
- `verifyAuth` throws bare `Unauthorized` when no session cookie exists.

### Call sites (~43, mechanical)

Every catch block that today constructs a 401 becomes:

```ts
if (isUnauthorizedError(error)) return unauthorizedResponse(error.message);
```

- **Agent routes (12 files)** — currently echo `error.message` with a
  `startsWith('Unauthorized')` guard. Behavior preserved, message enriched.
- **User routes (18 files, 31 sites)** — currently hardcode
  `{ error: 'Unauthorized' }` with an `=== 'Unauthorized'` guard. Switching to
  `isUnauthorizedError` also maps errors like a Firebase token fault starting
  with "Unauthorized" to 401 instead of falling through to 500 — an
  improvement, not a regression.

### Example responses

Agent, bad token:

```json
{ "error": "Unauthorized: Invalid or revoked token. Read the skill.md for API access and troubleshooting: https://www.getanban.com/skill.md" }
```

User, expired session:

```json
{ "error": "Unauthorized. Read the skill.md for API access and troubleshooting: https://www.getanban.com/skill.md" }
```

## Testing

- Unit tests for the helper: returns 401 status; message contains the
  skill.md URL; leading `Unauthorized:` prefix is stripped from detail;
  absent detail yields the generic message.
- Route-level test: `GET /api/agent/boards` with no Authorization header
  returns 401 whose body contains the skill.md URL.

## Explicitly out of scope

- HTML pages / dashboard auth UX (unchanged redirect to `/login`).
- `public/skill.md` content — already documents 401 semantics.
- Structured error fields, error codes, or response schema changes.
- `verifyIdToken` internals or Firebase error taxonomy.
