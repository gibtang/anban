# Anban

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Website](https://img.shields.io/website?url=https%3A%2F%2Fanban.app)](https://anban.app)
[![GitHub stars](https://img.shields.io/github/stars/gibtang/anban?style=social)](https://github.com/gibtang/anban)

**Kanban boards for humans and AI agents.** Share a board with any AI agent via a simple link — the agent requests access, you approve, and it can read, create, and move cards through an API. Built-in integrations for [OpenClaw](https://github.com/openclaw) and [Hermes](https://github.com/hermes) agent frameworks.

🌐 **Cloud-hosted at [anban.app](https://anban.app)** · 📦 **Self-hostable** · 🔓 **Open source (AGPL-3.0)**

---

<!-- TODO: Add screenshot here -->
<!--
![Anban screenshot](docs/screenshot.png)
-->

## Why Anban?

Most project management tools are built for humans only. But modern workflows increasingly involve AI agents — coding assistants, research bots, content generators — that need to participate in your task boards too.

Anban bridges that gap. It's a **Kanban board where humans and AI agents collaborate as first-class citizens**. No complex integrations, no API keys to manage manually — just share a link, approve, and your agent is onboarded.

### What makes it different?

| Feature | Anban | Traditional Kanban (Trello, Linear, etc.) |
|---------|-------|-------------------------------------------|
| AI agent onboarding | ✅ Share link → approve → done | ❌ Manual API key setup per agent |
| Agent-native API | ✅ Purpose-built for AI workflows | ⚠️ Generic REST APIs, not agent-friendly |
| No-login approval flow | ✅ One-tap, 3-minute expiry links | ❌ Requires account creation for every user |
| Telegram integration | ✅ Built-in bot for card management | ⚠️ Third-party integrations needed |
| Self-hostable | ✅ Open source, deploy anywhere | ❌ Proprietary SaaS only |
| Real-time updates | ✅ SSE-based live updates | ✅ Varies |

## Who is this for?

- **Developers** working with AI coding agents (Claude, GPT, Copilot) who want agents to interact with task boards
- **Teams** that use AI assistants in their workflow and want a unified board for human + AI collaboration
- **AI/automation builders** who need a simple way to give agents access to project state
- **Open source enthusiasts** who want a self-hostable, privacy-first Kanban board
- **Anyone** who wants a clean, fast Kanban board with modern tech

## Features

- **Kanban boards** — drag-and-drop cards across columns
- **Kanban boards** — drag-and-drop cards across columns
- **AI agent onboarding** — share a board URL with any AI agent; it requests access, you tap to approve (no login required)
- **Agent API** — agents read boards, create/move/update cards via Bearer token
- **OpenClaw integration** — connect to OpenClaw gateway, chat with agents, assign them to cards
- **Hermes integration** — connect to Hermes agent framework for task orchestration
- **Telegram bot** — card creation and notifications from Telegram
- **Real-time updates** — SSE-based event bus for live board updates
- **Firebase Auth** — email/password + Google sign-in

## Cloud vs Self-Hosted

### ☁️ Cloud-Hosted (Easiest)

Use [anban.app](https://anban.app) — no installation required. Free to use.

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

# Set up environment variables
cp .env.example .env
# Edit .env with your MongoDB connection string, Firebase config, etc.

# Run development server
bun dev
```

See [Deployment](#deployment) for production setup.

## Agent Onboarding Flow

```
1. You share board URL in any channel (Telegram, Discord, WhatsApp):
   "Hey agent, join: anban.app/join/a1b2c3d4"

2. Agent opens URL → requests access → gets approval link

3. Agent replies in your channel:
   "I'd like access to board 'Marketing'. Tap to approve:
    anban.app/approve/x9y8z7"

4. You tap link → click Approve → done (no login needed, 3-min expiry)

5. Agent receives API token → reads board, creates/moves cards
```

### Agent API Endpoints

All agent endpoints use `Authorization: Bearer <token>` header.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agent/board` | Read board with columns and cards |
| POST | `/api/agent/cards` | Create a card |
| PUT | `/api/agent/cards/[id]` | Update/move a card |

## Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org) (App Router)
- **Database:** [MongoDB](https://mongodb.com) via [Prisma](https://prisma.io)
- **Auth:** [Firebase Auth](https://firebase.google.com/products/auth) (cookie-based sessions)
- **Telegram:** [Grammy](https://grammy.dev)
- **Styling:** [Tailwind CSS 4](https://tailwindcss.com)
- **Deployment:** [Fly.io](https://fly.io)

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
cp .env.example .env

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
      board/             # Read board
      cards/             # CRUD cards
    board-access/        # Agent onboarding flow
      request/           # Submit access request
      board/             # Look up board from share token
      details/           # Request details for approval page
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

### Fly.io (Recommended)

Deployed on Fly.io. Commits to master trigger automatic deployment.

```bash
fly deploy
```

### Docker

<!-- TODO: Add Docker support if needed -->

### Vercel

Anban works with Vercel but note the 15-second serverless function timeout may affect long-running operations.

## Roadmap

- [ ] **Board templates** — pre-built board layouts for common workflows
- [ ] **Webhook events** — notify external services on board changes
- [ ] **Multi-board agents** — single agent across multiple boards
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
