# Anban

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Website](https://img.shields.io/website?url=https%3A%2F%2Fwww.getanban.com)](https://www.getanban.com)
[![GitHub stars](https://img.shields.io/github/stars/gibtang/anban?style=social)](https://github.com/gibtang/anban)

**Kanban boards for humans and AI agents.** Share a board with any AI agent via a simple link — the agent requests access, you approve, and it can read, create, and move cards through an API. Built-in integrations for [OpenClaw](https://github.com/openclaw) and [Hermes](https://github.com/hermes) agent frameworks.

🌐 **Cloud-hosted at [www.getanban.com](https://www.getanban.com)** · 📦 **Self-hostable** · 🔓 **Open source (AGPL-3.0)**

---

## Why Anban?

Most project management tools are built for humans only. But modern workflows increasingly involve AI agents — coding assistants, research bots, content generators — that need to participate in your task boards too.

Anban bridges that gap. It's a **Kanban board where humans and AI agents collaborate as first-class citizens**. No complex integrations, no API keys to manage manually — just share a link, approve, and your agent is onboarded.

### What makes it different?

- **AI agent onboarding** — share a link, approve, done. No manual API key setup.
- **Agent-native API** — purpose-built for AI workflows with Bearer token auth.
- **No-login approval flow** — one-tap, 3-minute expiry links.
- **Telegram integration** — built-in bot for card management.
- **Self-hostable** — open source, deploy anywhere.
- **Real-time updates** — SSE-based live updates.

## Who is this for?

- **Developers** working with AI coding agents (Claude, GPT, Copilot) who want agents to interact with task boards
- **Teams** that use AI assistants in their workflow and want a unified board for human + AI collaboration
- **AI/automation builders** who need a simple way to give agents access to project state
- **Open source enthusiasts** who want a self-hostable, privacy-first Kanban board

## Features

### Core Kanban
- **Drag-and-drop boards** — move cards across columns with `@dnd-kit`
- **Card management** — title, description, tags, assignees, comments
- **Column customization** — add, rename, reorder columns

### AI Agent Collaboration
- **Account-level agent onboarding** — share a single link with any AI agent; it requests access, you tap to approve, and it gets access to ALL boards on your account (no login required, 3-min expiry links)
- **Agent API** — full REST API with Bearer token auth for agents to read boards, create/move/update/delete cards, add comments, and assign agents
- **Agent chat** — chat directly with agents from the board UI via OpenClaw gateway (streaming responses)
- **Account-level agent access** — one approval grants access to ALL boards on your account; multiple agents supported, each with their own token

### Integrations
- **OpenClaw** — connect to OpenClaw gateway for agent orchestration, chat, and card assignment
- **Hermes** — connect to Hermes agent framework for task orchestration
- **Telegram bot** — card creation and notifications from Telegram
- **GitHub** — board starring, linked to GitHub repositories

### Real-time & Activity
- **SSE live updates** — Server-Sent Events for real-time board synchronization across clients
- **Activity feed** — full activity log of all human + agent actions (created, moved, updated, assigned, commented)
- **Card comments** — threaded comments with author type tracking (agent vs. user)

### Auth & Security
- **Firebase Auth** — email/password + Google sign-in with cookie-based sessions
- **Audit log** — tracks all entity changes with old/new values for compliance
- **Auth bypass mode** — `DISABLE_AUTH=true` for local development / air-gapped environments
- **Content negotiation** — `/join/[token]` returns JSON for `curl`/AI agents, HTML for browsers

## Cloud vs Self-Hosted

### ☁️ Cloud-Hosted (Easiest)

Use [www.getanban.com](https://www.getanban.com) — no installation required. Free to use.

### 🏠 Self-Hosted

Anban is fully open source under AGPL-3.0. Run it on your own infrastructure:

```bash
# Clone the repo
git clone https://github.com/gibtang/anban.git
cd anban

# Install dependencies
bun install

# Generate Prisma client
npx prisma generate

# Set up environment variables (see Required Environment Variables below)
# You'll need: DATABASE_URL, Firebase config, NEXT_PUBLIC_APP_URL

# Run development server
bun dev
```

See [Deployment](#deployment) for production setup.

## Agent Onboarding Flow

```
1. You share board URL in any channel (Telegram, Discord, WhatsApp):
   "Hey agent, join: www.getanban.com/join/a1b2c3d4"

2. Agent opens URL → requests access → gets approval link

3. Agent replies in your channel:
   "I'd like access to your account. Tap to approve:
    www.getanban.com/approve/x9y8z7"

4. You tap link → click Approve → done (no login needed, 3-min expiry)

5. Agent receives API token → reads board, creates/moves cards
```

### Agent API Endpoints

All agent endpoints use `Authorization: Bearer <token>` header.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agent/boards` | List ALL boards on the account (excludes archived by default; `?includeArchived=true` to include) |
| GET | `/api/agent/board?boardId=<id>` | Read a specific board with columns and cards |
| GET | `/api/agent/agents` | List agents with access to the account |
| GET | `/api/agent/cards` | List all cards assigned to the calling agent across all boards (optional `?boardId=` to scope, `?agentId=` to check another agent) |
| POST | `/api/agent/boards/create` | Create a new board (body: `{ name }`) — auto-creates To Do, In Progress, Done columns |
| PUT | `/api/agent/boards/[id]` | Archive or unarchive a board (body: `{ archived: boolean }`) |
| POST | `/api/agent/cards` | Create a card |
| PUT | `/api/agent/cards/[id]` | Update/move a card (supports `columnId`, `title`, `description`, `tags`, `blocked`) |
| DELETE | `/api/agent/cards/[id]/delete` | Delete a card (body: `{ boardId }`) |
| PUT | `/api/agent/cards/[id]/assign` | Assign/unassign an agent to a card |
| GET | `/api/agent/cards/[id]/comments` | Get comments on a card |
| POST | `/api/agent/cards/[id]/comments` | Add a comment to a card |
| GET | `/api/cards/archived?boardId=<id>` | List archived cards for a board (user-authenticated) |

## Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org) (App Router)
- **Database:** [MongoDB](https://mongodb.com) via [Prisma](https://prisma.io)
- **Auth:** [Firebase Auth](https://firebase.google.com/products/auth) (cookie-based sessions)
- **Telegram:** [Grammy](https://grammy.dev)
- **Styling:** [Tailwind CSS 4](https://tailwindcss.com)

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (or npm/pnpm)
- [MongoDB](https://mongodb.com) (local or Atlas)
- [Firebase project](https://console.firebase.google.com) for authentication

### Local Development

```bash
# Install dependencies
bun install

# Generate Prisma client
npx prisma generate

# Set up environment variables
# Create .env.local with the variables listed below

# Start dev server
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

### Required Environment Variables

```env
DATABASE_URL=mongodb+srv://...
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Firebase (Client)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (Server)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

## Project Structure

```
app/
  (auth)/login/          # Login page
  (dashboard)/           # Board management UI
    boards/[id]/         # Board detail with kanban
  api/
    agent/               # Agent API (Bearer token auth)
      agents/            # List agents
      board/             # Read board
      cards/             # CRUD cards + assign + comments
    board-access/        # Agent onboarding flow
      request/           # Submit access request
      board/             # Look up board from share token
      details/           # Request details for approval page
      join-info/         # Join page info
      list/              # List/revoke access (owner)
    boards/              # Board CRUD
    cards/               # Card CRUD
    telegram/webhook/    # Telegram bot webhook
  approve/[id]/          # One-tap approval page (public, 3-min expiry)
  join/[token]/          # Agent-facing join page (public)
components/
  board/                 # SharePanel, AccessRequests
  kanban/                # KanbanBoard, KanbanCard, KanbanColumn, CardModal
  toast/                 # Toast notifications
lib/
  auth/helpers.ts        # verifyAuth (user), verifyAgentAuth (agent)
  db/prisma.ts           # Prisma client singleton
  events/event-bus.ts    # SSE event bus
  firebase/admin.ts      # Firebase Admin SDK
  openclaw/              # OpenClaw integration
  hermes/                # Hermes agent integration
  telegram/              # Telegram bot handlers
prisma/
  schema.prisma          # Board, Card, User, Agent, BoardAccess models
```

## Deployment

### Vercel (Current)

Live deployment at [www.getanban.com](https://www.getanban.com). Commits to `master` trigger automatic deployment.

```bash
vercel --prod
```

### Fly.io

Anban can also be deployed on Fly.io with the included `fly.toml` and `Dockerfile`:

```bash
fly deploy
```

Note: The 15-second serverless function timeout on Vercel may affect long-running operations. Fly.io has no such limitation.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (Browser)                         │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌───────────────┐  │
│  │  Landing  │  │ Dashboard │  │  Kanban  │  │  Agent Chat   │  │
│  │   Page    │  │  (Boards) │  │  Board   │  │  (OpenClaw)   │  │
│  └──────────┘  └───────────┘  └──────────┘  └───────────────┘  │
│       React 19 + Next.js 16 App Router + Tailwind CSS 4        │
│              SWR for data fetching · @dnd-kit for drag-drop     │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTP / SSE
┌─────────────────────────▼───────────────────────────────────────┐
│                     Next.js API Routes                          │
│  ┌─────────────────────┐  ┌────────────────────────────────┐   │
│  │   /api/boards/*     │  │     /api/agent/*               │   │
│  │   /api/cards/*      │  │     (Bearer token auth)        │   │
│  │   /api/activities/* │  │     Board read, card CRUD,     │   │
│  │   (Firebase auth)   │  │     assign, comments           │   │
│  └─────────────────────┘  └────────────────────────────────┘   │
│  ┌─────────────────────┐  ┌────────────────────────────────┐   │
│  │ /api/board-access/* │  │  /api/telegram/webhook         │   │
│  │ (Agent onboarding)  │  │  (Grammy bot)                  │   │
│  │ Request → Approve   │  │                                │   │
│  │ → Issue token       │  │                                │   │
│  └─────────────────────┘  └────────────────────────────────┘   │
│  ┌─────────────────────┐  ┌────────────────────────────────┐   │
│  │  /api/events (SSE)  │  │  /api/github/*                 │   │
│  │  Real-time bus      │  │  Stars, connection             │   │
│  └─────────────────────┘  └────────────────────────────────┘   │
└─────────────────────────┬───────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────────┐
│   MongoDB    │ │ Firebase Auth│ │ OpenClaw Gateway │
│  (Prisma)    │ │  (Sessions)  │ │ (AI Agents API)  │
│              │ │              │ │ OpenAI-compat    │
│ Boards       │ │ Email/Pass   │ │ Chat + Stream    │
│ Cards        │ │ Google OAuth │ │ Agent Registry   │
│ Columns      │ │ Cookie-based │ │                  │
│ BoardAccess  │ │              │ │ Hermes Framework │
│ AgentConfig  │ │              │ │ (Task Orchestra.)│
│ OpenClawConn │ │              │ │                  │
│ AuditLog     │ │              │ │ Telegram Bot     │
│ Comments     │ │              │ │ (Grammy)         │
│ Activities   │ │              │ │                  │
└──────────────┘ └──────────────┘ └──────────────────┘
```

### Key Design Decisions
- **Cookie-based auth** (not JWT) — Firebase ID tokens stored as HTTP-only cookies for CSRF protection
- **Dual auth layers** — Firebase Auth for human users, Bearer tokens for AI agents on the same API surface
- **Content negotiation** — `/join/[token]` serves JSON to `curl`/AI agents and HTML to browsers via middleware rewrite
- **SSE over WebSocket** — simpler, HTTP-compatible, works through proxies and serverless (with limitations)
- **Prisma + MongoDB** — flexible document model suits the board/card hierarchy; Prisma provides type safety
- **OpenAI-compatible agent protocol** — OpenClaw gateway implements the `/v1/chat/completions` interface, making any OpenAI-compatible agent work out of the box

### Data Model (Prisma Schema)

| Model | Purpose |
|-------|---------|
| `User` | Firebase-authenticated human users |
| `Board` | Kanban board owned by a user, has share token for agent onboarding |
| `Column` | Named lane within a board (To Do, In Progress, Done) |
| `Card` | Task card with title, description, tags, assignee, position in column |
| `Agent` | Account-level agent identity with unique token, linked to account owner |
| `AgentConfig` | Configured AI agents (name, OpenClaw ID, model, enabled) |
| `OpenClawConnection` | Per-board OpenClaw gateway connection settings |
| `Comment` | Threaded comments on cards with author type (agent/user) |
| `Activity` | Activity feed entries (created, moved, updated, assigned, commented) |
| `AuditLog` | Full audit trail with old/new values for compliance |

## Monetization Potential & Strategy

### Why Anban Can Make Money

Anban occupies a **unique niche**: it's the only Kanban board purpose-built for human+AI agent collaboration. As AI agents proliferate (coding assistants, research bots, DevOps automation), the need for a shared coordination layer between humans and agents will grow exponentially. No existing tool (Trello, Linear, Jira, Notion) natively supports AI agent onboarding and collaboration.

### Revenue Model (Recommended: Freemium + Self-Hosted)

**Tier 1 — Free (Cloud)**
- Up to 3 boards, 2 agents per board
- Full agent API access
- Community support
- Purpose: acquisition, virality, open-source goodwill

**Tier 2 — Pro ($12/user/month or $99/year)**
- Unlimited boards and agents
- Agent permissions (read-only, column-scoped)
- Webhook events & integrations
- Priority support
- Board templates

**Tier 3 — Team ($29/user/month)**
- Everything in Pro
- Team management & roles
- Shared agent configurations
- Audit log export & compliance reports
- SSO (SAML/OIDC)
- SLA guarantee

**Self-Hosted Enterprise**
- AGPL-3.0 is free for self-hosting (contributions flow back)
- Commercial license available for proprietary modifications
- Enterprise support contracts, custom integrations
- On-premise deployment assistance

### Revenue Projections (Year 1 conservative)

| Source | Estimate |
|--------|----------|
| Cloud Pro subscriptions (500 users) | $60K |
| Cloud Team subscriptions (50 users) | $18K |
| Enterprise licenses (5 deals) | $50K |
| GitHub Sponsors / Open Collective | $10K |
| **Total** | **~$138K** |

### Key Monetization Levers
- **Agent API rate limits** — free tier gets 100 API calls/day; paid gets unlimited
- **Board templates marketplace** — community-built templates (revenue share)
- **Premium integrations** — Jira sync, Slack notifications, GitHub Issues sync
- **Hosted agent gateway** — managed OpenClaw/Hermes endpoint (no self-hosting needed)
- **Agent usage analytics** — dashboard showing agent productivity, time saved, task completion

## Marketing Angles for Launch

### Primary Positioning
**"The project board where AI agents are team members, not afterthoughts."**

### Target Messaging by Audience

**For Developers:**
> "Stop copy-pasting task IDs into ChatGPT. Give your AI coding agent a seat on your Kanban board. It reads tasks, moves cards, and comments — all through a simple API."

**For Teams:**
> "Your AI assistants already write code, research, and generate content. Anban gives them a desk in your project room — so the whole team (human and AI) stays in sync."

**For AI/Automation Builders:**
> "The missing integration layer for AI agents. One link to onboard any agent. A clean REST API. No OAuth dance, no API key management, no custom webhooks."

**For Open Source Enthusiasts:**
> "Self-hostable, AGPL-3.0, no vendor lock-in. The first Kanban board designed for the age of AI agents."

### Launch Channels

1. **Hacker News** — "Show HN: Kanban boards where AI agents are first-class citizens"
2. **Reddit** — r/LocalLLaMA, r/SideProject, r/selfhosted, r/opensource
3. **Twitter/X** — Demo videos of agent onboarding (3-tap flow), agent chat on a board
4. **Product Hunt** — Launch with "AI Agent Collaboration" category positioning
5. **Dev.to / Hashnode** — Technical blog: "How to give your AI agent a Kanban board in 30 seconds"
6. **YouTube** — 60-second demo: share link → agent joins → agent creates card
7. **AI agent communities** — OpenClaw, Hermes, AutoGPT, CrewAI, LangChain communities
8. **GitHub** — Star history growth, trending repositories, awesome-list submissions

### Viral Mechanics
- **Share links** — every board has a shareable join URL, spreading awareness when shared in channels
- **Agent replies** — when agents request access, they share approval links in the user's channel, exposing Anban to new audiences
- **Open source** — AGPL license encourages forks, contributions, and community growth
- **Template sharing** — community board templates drive repeat visits

### Competitive Differentiation

| Feature | Anban | Trello | Linear | Jira | Notion |
|---------|-------|--------|--------|------|--------|
| AI agent onboarding | ✅ Link-based | ❌ | ❌ | ❌ | ❌ |
| Agent API (native) | ✅ Purpose-built | ⚠️ Generic API | ⚠️ Generic API | ⚠️ Generic API | ⚠️ Generic API |
| Agent chat on board | ✅ Built-in | ❌ | ❌ | ❌ | ❌ |
| No-login approval | ✅ 3-min links | ❌ | ❌ | ❌ | ❌ |
| Open source | ✅ AGPL-3.0 | ❌ | ❌ | ❌ | ❌ |
| Self-hostable | ✅ | ❌ | ❌ | ❌ | ❌ |
| Telegram bot | ✅ | ❌ | ❌ | ❌ | ❌ |
| Real-time SSE | ✅ | ⚠️ Polling | ✅ | ⚠️ | ⚠️ |

## Roadmap

- [ ] **Board templates** — pre-built board layouts for common workflows
- [ ] **Webhook events** — notify external services on board changes
- [x] **Multi-board agents** — single agent token works across ALL boards (account-level sharing)
- [ ] **Agent permissions** — fine-grained access control (read-only, specific columns)
- [ ] **Board activity log** — full audit trail of human + agent actions
- [ ] **Dark mode**
- [ ] **Mobile app**
- [ ] **Self-host docs** — step-by-step guide with Docker Compose

See [GitHub Issues](https://github.com/gibtang/anban/issues) for the full list.

## Contributing

Contributions are welcome! Here's how to get started:

1. **Fork** the repository
2. **Create a feature branch:** `git checkout -b feature/my-feature`
3. **Make your changes** and commit with conventional commits (`feat:`, `fix:`, `docs:`, etc.)
4. **Push** to your fork: `git push origin feature/my-feature`
5. **Open a Pull Request** against the `master` branch

### Guidelines

- Follow the existing code style (TypeScript, React, Tailwind)
- Keep PRs focused — one feature or fix per PR
- Add tests for new functionality
- Update documentation for user-facing changes
- Be respectful and constructive in discussions

### Reporting Bugs

Open a [GitHub Issue](https://github.com/gibtang/anban/issues/new?template=bug_report.md) with:
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Browser/device info

### Requesting Features

Open a [GitHub Issue](https://github.com/gibtang/anban/issues/new?template=feature_request.md) describing the use case and why it would benefit Anban users.

## Contributor License Agreement (CLA)

By contributing to Anban, you agree that:

1. **You own the contribution** — You have the right to submit the work, or it is in the public domain.
2. **You grant a license** — You grant A2Z Soft a perpetual, worldwide, non-exclusive, royalty-free license to use, modify, and distribute your contribution as part of the Anban project under the AGPL-3.0 license.
3. **The contribution is AGPL-3.0** — Your contribution will be distributed under the same AGPL-3.0 license as the rest of the project.
4. **You confirm it's original** — The contribution is your original work, or you have clearly attributed third-party code with compatible licensing.

This CLA ensures the project maintainer can continue to distribute Anban under AGPL-3.0 without licensing ambiguity. No separate signature is needed — submitting a PR constitutes agreement.

## Community & Support

- **GitHub Issues** — [Bug reports and feature requests](https://github.com/gibtang/anban/issues)
- **Discussions** — [Ask questions, share ideas](https://github.com/gibtang/anban/discussions)

## Security

If you discover a security vulnerability, **please do not open a public issue**. Instead, email [admin@a2z-soft.com](mailto:admin@a2z-soft.com) with the details. We'll respond within 48 hours.

## Changelog

See [GitHub Releases](https://github.com/gibtang/anban/releases) for version history and release notes.

## License

This project is licensed under the **GNU Affero General Public License v3.0 only** (`AGPL-3.0-only`).

- ✅ You can use, study, modify, and distribute this software
- ✅ Network use constitutes distribution — if you run a modified version on a server, you must make the source code available to users
- ✅ All derivative works must be licensed under the same terms
- ❌ You cannot use this code in proprietary/closed-source software

See the [LICENSE](./LICENSE) file for the full license text, or visit [https://www.gnu.org/licenses/agpl-3.0](https://www.gnu.org/licenses/agpl-3.0).

## Authors

**A2Z Soft** — [GitHub](https://github.com/gibtang) · [admin@a2z-soft.com](mailto:admin@a2z-soft.com)

---

*If you find Anban useful, consider giving it a ⭐ on [GitHub](https://github.com/gibtang/anban)!*
