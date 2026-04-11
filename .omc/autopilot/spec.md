# Anban - OpenClaw Agent Kanban Board

**Project:** Anban  
**Type:** Web-based Kanban board for OpenClaw agents with Telegram bot integration  
**Status:** Specification Complete  
**Date:** 2026-04-11

---

## Executive Summary

Anban is a web-based Kanban board designed for orchestrating, monitoring, and coordinating OpenClaw autonomous agents through a unified interface with Telegram bot integration. It combines task management (a), team coordination (b), and agent observability (c) into a single platform.

**Key Insight:** OpenClaw exposes a gateway protocol (WebSocket + HTTP) but no client SDK. Anban uses an **adapter pattern** to integrate with OpenClaw flexibly.

---

## 1. Requirements Analysis

### 1.1 Functional Requirements

#### Core Features
1. **Kanban Board Management**
   - Create/edit/delete boards with customizable columns
   - Drag-and-drop cards between columns
   - Assign agents and users to cards
   - Add descriptions, tags, and metadata to cards

2. **OpenClaw Agent Integration**
   - List available OpenClaw agents
   - View active agent sessions
   - Send messages to agents
   - Subscribe to agent events (status changes, errors, completions)

3. **Telegram Bot Interface**
   - Authenticate users via Telegram
   - View board status via commands
   - Move cards between columns
   - Assign agents to tasks
   - Receive notifications on agent events
   - Chat with agents directly

4. **Real-time Updates**
   - Server-Sent Events (SSE) for live board updates
   - Agent status changes pushed to UI
   - Telegram notifications for important events

#### Authentication & Authorization
- Firebase Auth for web UI
- Telegram user linkage to Firebase accounts
- Single-user MVP (with extensibility for multi-tenant)

### 1.2 Non-Functional Requirements

| Category | Requirement | Target |
|----------|-------------|--------|
| Performance | Page load time | < 2s initial, < 500ms subsequent |
| Performance | API response | < 200ms p95 |
| Reliability | Uptime | 99% (Fly.io deployment) |
| Security | Auth | Firebase Auth + Telegram verification |
| Security | Data | PostgreSQL with Prisma ORM |
| Scalability | Concurrent users | 10 (MVP), extensible to 100+ |
| Usability | Learning curve | < 5 min to create first board |

### 1.3 Implicit Requirements

1. **Agent Configuration Management**: Store OpenClaw gateway URLs and API keys per board
2. **Telegram Bot Management**: Store bot tokens and webhook configurations
3. **Audit Trail**: Track who moved cards and when
4. **Error Handling**: Graceful degradation when OpenClaw is unreachable
5. **Mobile Responsiveness**: Telegram integration implies mobile usage
6. **Rate Limiting**: Protect OpenClaw gateway from spam
7. **Data Validation**: Prevent malicious payloads to OpenClaw

### 1.4 Out of Scope

- Multi-tenancy/team management (v2)
- Advanced analytics/reporting (v2)
- Custom agent tool configuration (v2)
- Video/voice chat with agents (v2)
- OpenClaw gateway administration (use OpenClaw directly)
- File sharing between agents (use OpenClaw directly)

---

## 2. Technical Specification

### 2.1 Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend** | Next.js 15 + React 19 | User's preferred stack; App Router; Server Components |
| **Styling** | Tailwind CSS 4 | User's preference; rapid UI development |
| **Database** | PostgreSQL + Prisma 6 | Type-safe ORM; reliable persistence |
| **Auth** | Firebase Auth | User's requirement; proven pattern from dramasub |
| **Real-time** | Server-Sent Events (SSE) | Simple unidirectional push; SWR for polling fallback |
| **Drag-Drop** | @dnd-kit/core | Modern; accessible; performant |
| **Telegram** | grammy | Type-safe Telegram Bot API framework |
| **Deployment** | Fly.io | User's preference; max 1 machine per guidelines |
| **OpenCLaw** | HTTP adapter (MVP) | Gateway HTTP API (OpenAI-compatible) |

### 2.2 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Kanban UI   │  │   Agent UI   │  │   Settings   │      │
│  │  (React/DnD) │  │  (Status/M)  │  │  (Config)    │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                 │               │
│         └─────────────────┴─────────────────┘               │
│                           │                                 │
└───────────────────────────┼─────────────────────────────────┘
                            │
                   ┌────────▼────────┐
                   │  Next.js App    │
                   │  (App Router)   │
                   └────────┬────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼────────┐  ┌───────▼────────┐  ┌──────▼─────┐
│ API Routes     │  │ API Routes     │  │  SSE       │
│ /api/boards/*  │  │ /api/agents/*  │  │  /api/events│
│ /api/cards/*   │  │ /api/openclaw* │  │            │
└───────┬────────┘  └───────┬────────┘  └────┬───────┘
        │                   │                │
        └───────────────────┴────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼────────┐  ┌───────▼────────┐  ┌──────▼─────┐
│ Prisma ORM     │  │ OpenClaw       │  │  Grammy    │
│ (PostgreSQL)   │  │ Adapter Layer  │  │  Bot       │
└────────────────┘  └───────┬────────┘  └────┬───────┘
                            │                │
                    ┌───────▼────────┐      │
                    │ OpenClaw       │      │
                    │ Gateway HTTP   │      │
                    │ (localhost)    │      │
                    └────────────────┘      │
                                            │
                                    ┌───────▼────────┐
                                    │  Telegram API  │
                                    └────────────────┘
```

### 2.3 File Structure

```
anban/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── boards/
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx
│   │   │   └── page.tsx
│   │   ├── agents/
│   │   │   └── page.tsx
│   │   └── settings/
│   │       └── page.tsx
│   ├── api/
│   │   ├── firebase-config/
│   │   │   └── route.ts
│   │   ├── boards/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       └── route.ts
│   │   ├── cards/
│   │   │   └── route.ts
│   │   ├── agents/
│   │   │   └── route.ts
│   │   ├── openclaw/
│   │   │   ├── proxy/
│   │   │   │   └── route.ts
│   │   │   └── webhook/
│   │   │       └── route.ts
│   │   ├── telegram/
│   │   │   └── webhook/
│   │   │       └── route.ts
│   │   └── events/
│   │       └── route.ts
│   ├── firebase.ts
│   ├── contexts/
│   │   └── AuthContext.tsx
│   └── layout.tsx
├── lib/
│   ├── openclaw/
│   │   ├── adapter.ts
│   │   ├── http-adapter.ts
│   │   └── types.ts
│   ├── telegram/
│   │   ├── bot.ts
│   │   ├── commands.ts
│   │   └── handlers.ts
│   ├── db/
│   │   └── prisma.ts
│   └── utils/
│       └── sse.ts
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── public/
├── .env.local
├── next.config.js
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

### 2.4 Dependencies

#### Production
```json
{
  "next": "15.1.0",
  "react": "19.0.0",
  "prisma": "^6.0.0",
  "@prisma/client": "^6.0.0",
  "firebase": "^11.0.0",
  "grammy": "^1.36.0",
  "@dnd-kit/core": "^6.3.0",
  "@dnd-kit/sortable": "^9.0.0",
  "swr": "^2.3.0",
  "zod": "^4.0.0"
}
```

#### Development
```json
{
  "@types/node": "^22.0.0",
  "typescript": "^5.7.0",
  "tailwindcss": "^4.0.0",
  "eslint": "^9.0.0",
  "fly.io": "latest"
}
```

### 2.5 API Surface

#### REST API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/boards` | GET/POST | List/create boards |
| `/api/boards/[id]` | GET/PUT/DELETE | Read/update/delete board |
| `/api/cards` | GET/POST | List/create cards |
| `/api/cards/[id]` | PUT/DELETE | Update/delete card |
| `/api/agents` | GET | List OpenClaw agents |
| `/api/agents/[id]/chat` | POST | Send message to agent |
| `/api/openclaw/proxy/*` | * | Proxy to OpenClaw gateway |
| `/api/telegram/webhook` | POST | Telegram webhook handler |
| `/api/events` | GET | SSE endpoint for real-time updates |

### 2.6 OpenClaw Adapter Interface

```typescript
interface OpenClawAdapter {
  // Health check
  health(): Promise<boolean>;

  // Agent management
  listAgents(): Promise<Agent[]>;
  listSessions(): Promise<Session[]>;

  // Messaging
  sendMessage(agentId: string, message: string): Promise<void>;

  // Events
  onAgentEvent(callback: (event: AgentEvent) => void): void;

  // Configuration
  configure(config: OpenClawConnection): void;
}

interface Agent {
  id: string;
  name: string;
  status: 'idle' | 'running' | 'error';
  capabilities: string[];
}

interface Session {
  id: string;
  agentId: string;
  startTime: Date;
  status: string;
}

interface AgentEvent {
  type: 'status' | 'message' | 'error' | 'complete';
  agentId: string;
  timestamp: Date;
  data: unknown;
}
```

### 2.7 Prisma Schema

```prisma
model User {
  id            String    @id @default(cuid())
  firebaseUid   String    @unique
  telegramId    String?   @unique
  createdAt     DateTime  @default(now())
  boards        Board[]
  cards         Card[]
}

model Board {
  id        String    @id @default(cuid())
  name      String
  ownerId   String
  owner     User      @relation(fields: [ownerId], references: [id])
  columns   Column[]
  cards     Card[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  // Configurations
  openclawConfig   OpenClawConnection?
  telegramConfig   TelegramConfig?
}

model Column {
  id        String   @id @default(cuid())
  name      String
  position  Int
  boardId   String
  board     Board    @relation(fields: [boardId], references: [id], onDelete: Cascade)
  cards     Card[]
  createdAt DateTime @default(now())
}

model Card {
  id          String   @id @default(cuid())
  title       String
  description String?
  position    Int
  columnId    String
  column      Column   @relation(fields: [columnId], references: [id], onDelete: Cascade)
  boardId     String
  board       Board    @relation(fields: [boardId], references: [id], onDelete: Cascade)
  assigneeId  String?
  assignee    User?    @relation(fields: [assigneeId], references: [id])
  tags        String[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Agent assignment
  agentId     String?
}

model AgentConfig {
  id        String   @id @default(cuid())
  agentId   String
  enabled   Boolean  @default(true)
}

model TelegramConfig {
  id        String   @id @default(cuid())
  botToken  String
  chatId    String?
  enabled   Boolean  @default(true)
}

model OpenClawConnection {
  id        String   @id @default(cuid())
  gatewayUrl String
  apiKey    String?
  enabled   Boolean  @default(true)
}
```

### 2.8 Telegram Commands

| Command | Description |
|---------|-------------|
| `/start` | Initialize bot, link Telegram account |
| `/status` | Show board overview and agent status |
| `/board [id]` | Display specific board details |
| `/agents` | List available OpenClaw agents |
| `/move [card] [col]` | Move card to different column |
| `/assign [card] [agent]` | Assign agent to card |
| `/chat [agent] [msg]` | Send message to agent |

### 2.9 Trade-off Analysis

| Decision | Option Chosen | Pros | Cons |
|----------|---------------|------|------|
| **OpenClaw Integration** | HTTP adapter (MVP) | Simple, reliable, easy to test | No real-time events (v2) |
| **Real-time Updates** | SSE + SWR fallback | Works everywhere, simple | Not bi-directional like WebSockets |
| **Drag-Drop** | @dnd-kit | Modern, accessible, performant | Steeper learning curve |
| **Database** | PostgreSQL | Reliable, ACID, Prisma support | Overkill for tiny scale |
| **Auth** | Firebase Auth | Proven pattern, easy Telegram link | External dependency |
| **Deployment** | Fly.io (1 machine) | User preference, simple scaling | Single point of failure |

---

## 3. Implementation Phases

### Phase 1: Foundation (Week 1)
- Project scaffolding (Next.js, Prisma, Firebase)
- Database schema and migrations
- Firebase Auth integration
- Basic Kanban UI (boards, columns, cards)

### Phase 2: OpenClaw Integration (Week 2)
- HTTP adapter implementation
- Agent listing and status
- Basic agent messaging
- Agent-to-card assignment

### Phase 3: Telegram Bot (Week 3)
- Grammy bot setup
- Webhook integration
- Command handlers
- Account linking

### Phase 4: Real-time & Polish (Week 4)
- SSE events endpoint
- Live board updates
- Error handling
- Testing & deployment

---

## 4. Success Criteria

1. Users can create boards and manage cards via drag-and-drop
2. OpenClaw agents are listed and can be assigned to cards
3. Telegram bot responds to commands and updates cards
4. Agent status changes are reflected in real-time on the board
5. Firebase Auth secures the application
6. Deployed on Fly.io with 99% uptime

---

## 5. References

- **OpenClaw Gateway**: `/Users/gibsontang/code/openclaw-source/src/gateway/`
- **Grammy Pattern**: `/Users/gibsontang/code/openclaw-source/src/telegram/bot.ts`
- **Firebase Auth**: `/Users/gibsontang/code/dramasub/frontend/app/`
- **User Guidelines**: `CLAUDE.md` (tech stack, Fly.io, iOS preferences)

---

**Status:** ✅ Specification Complete - Ready for Planning Phase
