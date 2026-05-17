# Anban

Kanban board app with AI agent integration. Share boards with AI agents via a simple link — agents request access, you approve, they interact with your board via API.

## Features

- **Kanban boards** — drag-and-drop cards across columns
- **AI agent onboarding** — share a board URL with any AI agent; it requests access, you tap to approve (no login required)
- **Agent API** — agents read boards, create/move/update cards via Bearer token
- **Telegram bot** — card creation and notifications from Telegram
- **Real-time updates** — SSE-based event bus for live board updates
- **Firebase Auth** — email/password + Google sign-in

## Tech Stack

- **Next.js 16** (App Router)
- **Prisma + MongoDB**
- **Firebase Auth** (cookie-based sessions for users)
- **Grammy** (Telegram bot)
- **Tailwind CSS 4**
- **Deployed on Fly.io**

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

## Getting Started

```bash
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

### Required Environment Variables

```
DATABASE_URL=mongodb+srv://...
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin
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
  telegram/              # Telegram bot handlers
prisma/
  schema.prisma          # Board, Card, User, Agent, BoardAccess models
```

## Deployment

Deployed on Fly.io. Commits to master trigger automatic deployment.

```bash
fly deploy
```

## License

AGPL-3.0-only
