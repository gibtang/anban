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


<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:ca08a54f -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

## Session Completion

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd dolt push
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
<!-- END BEADS INTEGRATION -->
