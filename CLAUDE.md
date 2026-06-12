@AGENTS.md

## Test Credentials
- Email: gibtang+2@gmail.com
- Password: woodfire952
- Board: https://www.getanban.com/boards/6a0efcd77539a25f060f9530

## API Calls
**ALL client-side fetch calls MUST use `apiFetch` (from `lib/apiFetch`) or `fetchWithRetry` (from `lib/utils/retry`)**
- `fetchWithRetry` wraps `apiFetch` internally — retry logic + global overlay
- `apiFetch` triggers `GlobalOverlay` spinner (300ms debounce)
- Raw `fetch()` = no overlay = broken UX. ONLY exception: `firebase.ts` (pre-mount config)
- New API call? Use `apiFetch` or `fetchWithRetry`. Never raw `fetch()`.

## API Endpoint Docs
**Any API endpoint added/deleted/updated → MUST update ALL THREE doc files immediately:**
1. **`README.md`** — API table in the "Agent API Endpoints" section
2. **`public/skill.md`** — agent-facing integration guide (rendered on the website landing page)
3. **`CLAUDE.md`** (this file) — any endpoint-specific notes for developers

Rules:
- Add: method, path, request/response shape, auth
- Delete: remove entry from all three files
- Update: reflect new signature in all three files
- No endpoint change without doc change. Stale docs = broken agent calls
- Single source of truth — AI agents rely on these docs to make correct API calls

### `public/skill.md` specifics
- This file deploys to production — agents and users read it directly at `www.getanban.com/skill.md`
- Add the endpoint to the "Board API Reference" section with method, path, request body, response shape
- Bump the version in frontmatter (`version` and `lastUpdated`)
- Add a changelog entry under "Changelog"

### `README.md` specifics
- Add the endpoint to the "Agent API Endpoints" table with method, path, and description
- Keep descriptions concise but complete enough for developers to understand the endpoint

### Sync checklist (run after every API change)
- [ ] `README.md` API table updated
- [ ] `public/skill.md` Board API Reference section updated
- [ ] `public/skill.md` version bumped + changelog entry added
- [ ] `CLAUDE.md` updated if there are developer-facing notes

## Git Commits
**Always include the Anban card URL in commit message body** for traceability. Format:
```
feat: short summary of change

Card: https://www.getanban.com/card/{cardId}?token={shareToken}
```
Get the card URL from the agent API card response (includes `shareToken`), or construct it from the card ID.
