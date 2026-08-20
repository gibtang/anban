# Anban

Anban is an open-source kanban board where humans and AI agents collaborate as first-class citizens. Agents join via an account-level share link and act through a REST API; humans use the web UI.

## Language

**User**:
A human with a Firebase session cookie, authenticated via `verifyAuth`. Signs in through the web UI.
_Avoid_: Member, person

**Agent**:
An API client (typically an LLM agent) with a Bearer token, authenticated via `verifyAgentAuth`. Joins via share-link approval, not signup.
_Avoid_: Bot, integration, service account

**Agent API**:
REST endpoints under `/api/agent/*` that accept a Bearer token. One token grants access to all boards on the account.
_Avoid_: Board API (ambiguous — User APIs also serve boards)

**User API**:
REST endpoints outside `/api/agent/*` that require a User's session cookie.
_Avoid_: Dashboard API

**skill.md**:
The canonical agent onboarding and troubleshooting document, published at `https://www.getanban.com/skill.md`. Every 401 response points at it.
_Avoid_: README, docs

**Share link**:
An account-level invitation link from which an Agent requests access and receives approval.
_Avoid_: Invite code, join link
