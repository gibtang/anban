# Self-Service 401 Errors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every API 401 response names the skill.md doc and its URL so agents can self-troubleshoot access failures.

**Architecture:** One helper (`unauthorizedResponse` + `isUnauthorizedError`) in `lib/auth/helpers.ts` owns the 401 shape. All ~47 catch-block 401 constructions across `app/api/**` (agent routes, user routes, and the SSE events route) call it. Throw sites are untouched — the helper normalizes their messages.

**Tech Stack:** Next.js 16 route handlers (App Router), TypeScript, `bun test` (bun:test), Prisma (not exercised by these tests).

**Spec:** `docs/superpowers/specs/2026-08-20-self-service-401s-design.md` (Tasks 1-5). Task 6 adds an owner-facing section to `public/skill.md` — approved in-session 2026-08-20; rides the same version bump.

## Global Constraints

- skill.md URL, verbatim: `https://www.getanban.com/skill.md`
- Message with detail, verbatim shape: `Unauthorized: <detail>. Read the skill.md for API access and troubleshooting: https://www.getanban.com/skill.md`
- Message without detail, verbatim: `Unauthorized. Read the skill.md for API access and troubleshooting: https://www.getanban.com/skill.md`
- Test command: `bun test` (from repo root)
- Do NOT modify: throw sites in `verifyAuth`/`verifyAgentAuth`, HTML pages / `/login` redirect, `public/skill.md`, response status codes, or existing `console.error` lines
- Commit style: conventional commits (`feat:`, `refactor:`, `test:`)
- Route handlers are plain functions — route-level tests import the handler and call it with `new NextRequest(...)`. Firebase admin init is lazy and Prisma doesn't connect until a query runs, so no-token 401 tests need no mocks or env credentials (verified by probe, 2026-08-20)

---

### Task 1: The 401 helper (TDD)

**Files:**
- Modify: `lib/auth/helpers.ts` (add exports below existing `verifyAgentAuth`)
- Create: `tests/auth-helpers.test.ts`

**Interfaces:**
- Consumes: `NextResponse` (already imported in `lib/auth/helpers.ts`)
- Produces (used by every later task):
  ```ts
  export function isUnauthorizedError(error: unknown): boolean
  export function unauthorizedResponse(detail?: string): NextResponse
  // 401 status; body: { error: string } per Global Constraints
  ```

- [ ] **Step 1: Write the failing tests**

Create `tests/auth-helpers.test.ts`:

```ts
import { describe, test, expect } from 'bun:test';
import { isUnauthorizedError, unauthorizedResponse } from '../lib/auth/helpers';

const URL_IN_MESSAGE = 'https://www.getanban.com/skill.md';

describe('isUnauthorizedError', () => {
  test('true for thrown Unauthorized errors', () => {
    expect(isUnauthorizedError(new Error('Unauthorized'))).toBe(true);
    expect(isUnauthorizedError(new Error('Unauthorized: Missing Bearer token'))).toBe(true);
  });

  test('false for other errors and non-errors', () => {
    expect(isUnauthorizedError(new Error('Board not found'))).toBe(false);
    expect(isUnauthorizedError('Unauthorized')).toBe(false);
    expect(isUnauthorizedError(null)).toBe(false);
  });
});

describe('unauthorizedResponse', () => {
  test('returns 401 with JSON error body', async () => {
    const res = unauthorizedResponse();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(typeof body.error).toBe('string');
  });

  test('message includes the skill.md URL', async () => {
    const body = await unauthorizedResponse().json();
    expect(body.error).toContain(URL_IN_MESSAGE);
  });

  test('keeps detail and strips a leading "Unauthorized:" prefix', async () => {
    const body = await unauthorizedResponse('Unauthorized: Invalid or revoked token').json();
    expect(body.error).toBe(
      'Unauthorized: Invalid or revoked token. Read the skill.md for API access and troubleshooting: https://www.getanban.com/skill.md'
    );
  });

  test('bare "Unauthorized" detail collapses to the generic message', async () => {
    const body = await unauthorizedResponse('Unauthorized').json();
    expect(body.error).toBe(
      'Unauthorized. Read the skill.md for API access and troubleshooting: https://www.getanban.com/skill.md'
    );
  });

  test('no detail yields the generic message', async () => {
    const body = await unauthorizedResponse().json();
    expect(body.error).toBe(
      'Unauthorized. Read the skill.md for API access and troubleshooting: https://www.getanban.com/skill.md'
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test tests/auth-helpers.test.ts`
Expected: FAIL — `isUnauthorizedError` / `unauthorizedResponse` are not exported.

- [ ] **Step 3: Implement in `lib/auth/helpers.ts`**

Append at the end of the file (below `verifyAgentAuth`):

```ts
const SKILL_MD_URL = 'https://www.getanban.com/skill.md';
const SKILL_MD_POINTER = `Read the skill.md for API access and troubleshooting: ${SKILL_MD_URL}`;

/**
 * True when an error was thrown by verifyAuth/verifyAgentAuth (their
 * messages all start with "Unauthorized").
 */
export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof Error && error.message.startsWith('Unauthorized');
}

/**
 * Build the canonical 401 response. Every API 401 points the caller at
 * the skill.md so agents can self-troubleshoot access problems.
 * `detail` may be a raw thrown message; a leading "Unauthorized:" is
 * stripped so it is not repeated.
 */
export function unauthorizedResponse(detail?: string): NextResponse {
  const stripped = detail?.replace(/^Unauthorized:?\s*/, '').trim();
  const base = stripped ? `Unauthorized: ${stripped}. ` : 'Unauthorized. ';
  return NextResponse.json({ error: `${base}${SKILL_MD_POINTER}` }, { status: 401 });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test tests/auth-helpers.test.ts`
Expected: 7 pass, 0 fail.

- [ ] **Step 5: Commit**

```bash
git add lib/auth/helpers.ts tests/auth-helpers.test.ts
git commit -m "feat: centralized 401 response pointing at skill.md"
```

---

### Task 2: Agent API routes (17 sites, 12 files)

**Files:**
- Create: `tests/agent-401.test.ts`
- Modify (site line numbers as of 2026-08-20, pre-conversion):
  - `app/api/agent/board/route.ts:47`
  - `app/api/agent/cards/route.ts:35,136`
  - `app/api/agent/cards/[id]/comments/route.ts:64,108`
  - `app/api/agent/cards/[id]/delete/route.ts:87`
  - `app/api/agent/cards/[id]/move-board/route.ts:169`
  - `app/api/agent/cards/[id]/assign/route.ts:87`
  - `app/api/agent/cards/[id]/route.ts:200`
  - `app/api/agent/agents/route.ts:40`
  - `app/api/agent/boards/route.ts:39`
  - `app/api/agent/boards/[id]/route.ts:57`
  - `app/api/agent/boards/create/route.ts:68`
  - `app/api/agent/profile/route.ts:29,67`

**Interfaces:**
- Consumes: `isUnauthorizedError`, `unauthorizedResponse` from Task 1
- Produces: all Agent API 401s match Global Constraints message format

- [ ] **Step 1: Write the failing route-level test**

Create `tests/agent-401.test.ts`:

```ts
import { describe, test, expect } from 'bun:test';
import { NextRequest } from 'next/server';
import { GET } from '../app/api/agent/boards/route';

describe('agent API 401 self-service', () => {
  test('no-token call returns 401 pointing at skill.md', async () => {
    const res = await GET(new NextRequest('http://localhost/api/agent/boards'));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain('https://www.getanban.com/skill.md');
    expect(body.error).toContain('Missing Bearer token');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/agent-401.test.ts`
Expected: FAIL — current message is `Unauthorized: Missing Bearer token` with no URL.

- [ ] **Step 3: Convert all 17 sites**

In each file, extend the helpers import, e.g.:

```ts
import { verifyAgentAuth, isUnauthorizedError, unauthorizedResponse } from '@/lib/auth/helpers';
```

Echo pattern (11 files) — before:

```ts
    if (error instanceof Error && error.message.startsWith('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
```

after:

```ts
    if (isUnauthorizedError(error)) {
      return unauthorizedResponse(error.message);
    }
```

Hardcoded pattern (`agent/profile/route.ts`, 2 sites) — before:

```ts
    if (error instanceof Error && error.message.startsWith('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
```

after: identical to the echo-pattern after-code (profile gains the token detail it previously dropped).

Keep every `console.error(...)` line untouched. Only the `if` guard and the 401 `return` change.

- [ ] **Step 4: Verify no raw 401s remain in agent routes**

Run: `grep -rn "status: 401" app/api/agent`
Expected: no output.

- [ ] **Step 5: Run tests to verify they pass**

Run: `bun test tests/agent-401.test.ts tests/auth-helpers.test.ts`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add tests/agent-401.test.ts app/api/agent
git commit -m "refactor: agent API 401s point at skill.md"
```

---

### Task 3: User API routes (30 sites, 17 files)

**Files:**
- Create: `tests/user-401.test.ts`
- Modify (site line numbers as of 2026-08-20, pre-conversion):
  - `app/api/activities/feed/route.ts:180`
  - `app/api/activities/route.ts:44`
  - `app/api/agents/[id]/cards/route.ts:38`
  - `app/api/agents/[id]/health/route.ts:58`
  - `app/api/agents/[id]/route.ts:33,119,152`
  - `app/api/agents/all/route.ts:43,93,133`
  - `app/api/agents/route.ts:21,66`
  - `app/api/ai/generate-title/route.ts:54`
  - `app/api/boards/[id]/route.ts:76,135,189`
  - `app/api/boards/route.ts:61,99`
  - `app/api/cards/[id]/comments/route.ts:45,116`
  - `app/api/cards/[id]/route.ts:190,253`
  - `app/api/cards/archived/route.ts:32`
  - `app/api/cards/route.ts:60,150`
  - `app/api/settings/route.ts:77,161`
  - `app/api/settings/test-connection/route.ts:97`
  - `app/api/user/share/route.ts:41,60`

**Interfaces:**
- Consumes: `isUnauthorizedError`, `unauthorizedResponse` from Task 1
- Produces: all User API 401s match Global Constraints message format

- [ ] **Step 1: Write the failing route-level test**

Create `tests/user-401.test.ts`:

```ts
import { describe, test, expect, beforeEach } from 'bun:test';
import { NextRequest } from 'next/server';
import { GET } from '../app/api/boards/route';

describe('user API 401 self-service', () => {
  beforeEach(() => {
    delete process.env.DISABLE_AUTH; // verifyAuth short-circuits when 'true'
  });

  test('no-cookie call returns 401 pointing at skill.md', async () => {
    const res = await GET(new NextRequest('http://localhost/api/boards'));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe(
      'Unauthorized. Read the skill.md for API access and troubleshooting: https://www.getanban.com/skill.md'
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/user-401.test.ts`
Expected: FAIL — current body is `{ "error": "Unauthorized" }`.

- [ ] **Step 3: Convert all 30 sites**

In each file, extend the helpers import, e.g.:

```ts
import { verifyAuth, isUnauthorizedError, unauthorizedResponse } from '@/lib/auth/helpers';
```

Every site has the same before-shape:

```ts
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
```

after:

```ts
    if (isUnauthorizedError(error)) {
      return unauthorizedResponse(error.message);
    }
```

Note: switching `===` to `isUnauthorizedError` also maps any Firebase token fault whose message starts with "Unauthorized" to 401 instead of 500 — an improvement, accepted in the spec. Keep `console.error` lines untouched.

- [ ] **Step 4: Verify no raw 401s remain in user routes**

Run: `grep -rn "status: 401" app/api --include="*.ts" | grep -v "app/api/events"`
Expected: no output.

- [ ] **Step 5: Run tests to verify they pass**

Run: `bun test`
Expected: all pass (existing suite included).

- [ ] **Step 6: Commit**

```bash
git add tests/user-401.test.ts app/api
git commit -m "refactor: user API 401s point at skill.md"
```

---

### Task 4: SSE events route (2 sites, 1 file)

**Files:**
- Modify: `app/api/events/route.ts:77-83`

**Interfaces:**
- Consumes: `isUnauthorizedError`, `unauthorizedResponse` from Task 1
- Produces: SSE endpoint 401s match Global Constraints message format

- [ ] **Step 1: Read the catch block**

Read `app/api/events/route.ts` lines 70-85. Current code:

```ts
  } catch (error) {
    console.error('Error in SSE endpoint:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return new Response('Unauthorized', { status: 401 });
    }
    return new Response('Authentication failed', { status: 401 });
  }
```

- [ ] **Step 2: Convert both 401 returns**

Replace the block above with:

```ts
  } catch (error) {
    console.error('Error in SSE endpoint:', error);
    if (isUnauthorizedError(error)) {
      return unauthorizedResponse(error.message);
    }
    return unauthorizedResponse('Authentication failed');
  }
```

Extend the import (the file imports `verifyAuth` from `@/lib/auth/helpers`; keep that, add the two):

```ts
import { verifyAuth, isUnauthorizedError, unauthorizedResponse } from '@/lib/auth/helpers';
```

Behavior note (accepted in design): the SSE 401 body becomes JSON instead of plain text. Browser UI treats any 401 on this stream as "signed out"; nothing parses the body.

- [ ] **Step 3: Verify**

Run: `grep -rn "status: 401" app/api`
Expected: no output (every 401 now flows through the helper).

Run: `bun test`
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add app/api/events/route.ts
git commit -m "refactor: SSE 401 points at skill.md"
```

---

### Task 5: Final sweep and build

**Files:**
- None modified (verification only; fix forward if anything surfaces)

- [ ] **Step 1: Confirm single source of truth**

Run: `grep -rn "status: 401" app/ lib/`
Expected: only `lib/auth/helpers.ts` (the `unauthorizedResponse` implementation).

Run: `grep -rn "getanban.com/skill.md" app/ lib/ tests/`
Expected: only `lib/auth/helpers.ts` and the test files.

- [ ] **Step 2: Full test suite**

Run: `bun test`
Expected: 0 fail.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: completes without type errors.

- [ ] **Step 4: Manual smoke check (optional, if dev server credentials exist)**

Run: `curl -s http://localhost:3000/api/agent/boards | head -c 300`
Expected: JSON whose `error` field ends with the skill.md URL.

- [ ] **Step 5: Commit any fix-forward changes**

Only if Steps 1-3 surfaced issues:

```bash
git add -A && git commit -m "fix: complete 401 skill.md rollout"
```

---

### Task 6: "For Board Owners" section in skill.md

**Files:**
- Modify: `public/skill.md` (served live at `https://www.getanban.com/skill.md`)

**Interfaces:**
- Consumes: nothing from earlier tasks
- Produces: owner-facing onboarding steps in the published doc; version bump to 0.10.0 whose changelog also records the 401 rollout from Tasks 1-5

**Context:** skill.md currently documents only the agent's half (request → poll → token). An owner who reads it to add an agent finds no steps. Verified facts: SharePanel in the board UI is headed "Share All Boards" with Copy and revoke (`components/board/SharePanel.tsx`); approval happens at `/approve/<requestId>` with Approve/Deny buttons (`app/approve/[id]/page.tsx`); requests expire after 3 minutes (already stated elsewhere in the doc). Do not invent unverified UI paths (e.g. agent-removal screens) — the section sticks to these three facts plus revoking the share link.

- [ ] **Step 1: Bump frontmatter**

In `public/skill.md`, change:

```md
version: "0.9.0"
lastUpdated: "2026-08-16"
```

to:

```md
version: "0.10.0"
lastUpdated: "2026-08-20"
```

- [ ] **Step 2: Insert the owner section**

Between the `---` line that follows `**Cloud:** https://www.getanban.com` and `## Quick Start (3 Steps)`, insert:

```md
## For Board Owners

Agents can't join on their own — an account owner grants access first. The full loop:

### 1. Generate your share link

Open any board and click **Share**. In the "Share All Boards" panel, click **Copy**. One link covers every board on your account, including boards you create later. You can revoke the link from the same panel at any time.

### 2. Hand the link to your agent

Paste the link wherever your agent reads instructions — its skill file, prompt, or credentials notes. The agent then runs the Quick Start below to request access.

### 3. Approve the request

Your agent will surface an approval URL (`https://www.getanban.com/approve/<requestId>`). Open it and click **Approve** — or **Deny** to refuse. Once approved, the agent receives its Bearer token automatically and can start working.

Access requests expire after 3 minutes. If one lapses before you approve it, the agent simply requests again — no cleanup needed.

---

```

- [ ] **Step 3: Add the changelog entry**

Under `## Changelog`, directly above `### v0.9.0 (2026-08-16)`, insert:

```md
### v0.10.0 (2026-08-20)
- New "For Board Owners" section — generate the share link, hand it to an agent, approve the request
- All API 401 responses now point at this skill.md for self-service troubleshooting

```

- [ ] **Step 4: Verify**

Run: `grep -c "For Board Owners" public/skill.md && grep -n "0.10.0" public/skill.md`
Expected: `1` and two matches (frontmatter + changelog).

Run: `bun test`
Expected: 0 fail (doc change can't break tests, but confirms clean tree state).

- [ ] **Step 5: Commit**

```bash
git add public/skill.md
git commit -m "docs: skill.md owner section for adding agents"
```
