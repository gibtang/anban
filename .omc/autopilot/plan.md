# Anban Implementation Plan

**Status**: APPROVED - Ready for Execution  
**Date**: 2026-04-11  
**Phases**: 6 (Foundation → Kanban UI → OpenClaw → Settings → Telegram → Polish)

---

## Critical Architecture Decisions

1. **OpenClaw Integration**: HTTP-only via `/v1/chat/completions`. Agent metadata stored in database (no WebSocket for MVP).
2. **SSE Events**: In-process EventEmitter with board-specific subscriptions.
3. **Auth**: Firebase Auth with cookie-based middleware (dramasub pattern).
4. **Deployment**: Fly.io with max 1 machine.

---

## Parallelization Strategy

**Group A** (Start immediately after Task 1.1):
- Task 1.2 (Prisma Schema)
- Task 1.5 (Firebase Config API)
- Task 3.1 (OpenClaw Types)
- Task 5.1 (Grammy Bot Init)
- Task 6.3 (Fly.io Config)

**Group B** (After Task 1.3):
- Task 1.13 (Board API)
- Task 1.14 (Card API)
- Task 3.3 (Agent Config API)
- Task 4.2 (Settings API)

**Group C** (After Task 1.7):
- Task 1.10 (Login Page)
- Task 1.11 (Dashboard Layout)
- Task 1.8 (Cookie API)

---

## Task List

See detailed task breakdown in the architect's revised plan above.

**Total Tasks**: 34 tasks across 6 phases  
**Estimated Duration**: 4 weeks (sequential) or 1-2 weeks (parallel agents)

---

## Next Steps

1. Initialize Next.js project (Task 1.1)
2. Spawn parallel executors for Group A tasks
3. Execute Phase 1 (Foundation) completely
4. Move to Phase 2 (Kanban UI)
5. Continue through Phase 6

---

**End of Plan**
