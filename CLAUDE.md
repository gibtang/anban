@AGENTS.md

## API Endpoint Docs
**Any API endpoint added/deleted/updated → MUST update both CLAUDE.md AND `public/skill.md` immediately.**
- Add: method, path, request/response shape, auth
- Delete: remove entry
- Update: reflect new signature
- Single source of truth — AI agents rely on this
- No endpoint change without doc change. Stale docs = broken agent calls
- **`public/skill.md`** is the public-facing agent integration guide rendered on the landing page via the `SkillMd` component. It MUST be kept in sync:
  - Add the endpoint to the "Board API Reference" section with method, path, request body, response shape
  - Bump the version in frontmatter (`version` and `lastUpdated`)
  - Add a changelog entry under "Changelog"
  - This file deploys to production — agents and users read it directly
