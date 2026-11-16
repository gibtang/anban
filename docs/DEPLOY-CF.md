# Cloudflare Workers deployment

Anban runs on Cloudflare Workers via `@opennextjs/cloudflare`. Data layer is the
raw MongoDB driver (`lib/db/mongo.ts`) — Prisma cannot run on Workers (query
engine needs Node; no MongoDB driver adapter exists; Prisma Accelerate
retired 2026-12-01).

## Deploy

```
npm run deploy        # opennextjs-cloudflare build + deploy (needs CLOUDFLARE_API_TOKEN)
npm run preview       # build + local workerd preview on :8787
```

CI: `.github/workflows/deploy.yml` on push to `main`. Repo secrets:
`CLOUDFLARE_API_TOKEN`, var `CLOUDFLARE_ACCOUNT_ID` (`0af4eab452c61ba50b9b84753bf2a5aa`).

## Environment (wrangler secrets)

| Var | Purpose |
|---|---|
| `DATABASE_URL` | Atlas SRV connection string, includes `/anban` db path |
| `FIREBASE_PROJECT_ID` | `anban-kanban` — used by ID-token JWKS verification |
| `FIREBASE_API_KEY` | Firebase Web API key (console) — served to browser via `/api/firebase-config` |
| `FIREBASE_AUTH_DOMAIN` | `anban-kanban.firebaseapp.com` |
| `NEXT_PUBLIC_APP_URL` | `https://getanban.com` |
| `OPENROUTER_API_KEY` | AI title generation (optional) |

Legacy `NEXT_PUBLIC_FIREBASE_*` names still work as fallback.

```
npx wrangler secret put DATABASE_URL
npx wrangler secret put FIREBASE_PROJECT_ID
...
```

## Auth on Workers

`lib/firebase/verify.ts` replaces firebase-admin's `verifyIdToken`: verifies
Google-signed ID tokens with `jose` against the Firebase JWKS (issuer
`https://securetoken.google.com/<projectId>`, audience `<projectId>`). No
service-account private key needed. Firebase Admin was the only firebase-admin
usage in the app.

## Data layer notes (`lib/db/mongo.ts`)

- Collections are named after Prisma models; `_id` and `@db.ObjectId` FKs are
  stored as ObjectId, surfaced as strings through typed mappers.
- Queries filter FK fields by ObjectId (Prisma parity). Some legacy docs store
  FKs as plain strings (old `Agent.ownerId`) — readers normalize both, writers
  always emit ObjectId.
- `@default(now())` / `@updatedAt` timestamps are written explicitly.
- `prisma/schema.prisma` stays as the schema documentation; it no longer
  generates a client.
- SSE events (`/api/events`) use an in-process event bus — on Workers this is
  per-isolate, same as a single Docker container.

## DNS cutover (getanban.com)

1. Move the `getanban.com` zone to Cloudflare (GoDaddy → CF nameservers, same
   PUT flow as the other migrated domains).
2. Add a worker route `getanban.com/*` + `www.getanban.com/*` → worker `anban`
   (custom-domains API is not permitted for the account token; routes work),
   with proxied A records like the japan-like/korea-like/taiwan-like cutover.
3. Add `getanban.com` + workers.dev preview domain to Firebase Auth →
   Authorized domains.
4. Rollback: repoint DNS to the Coolify/VPS image (Dockerfile kept in repo;
   rebuild GHCR image from the pre-migration commit).

## Runtime differences vs Coolify

- No request timeout on streaming (SSE/agent chat) — parity.
- Mongo connects over `nodejs_compat` TCP sockets (~300 ms cold connect per
  isolate; pool reused across requests within the isolate).
- `DISABLE_AUTH=true` works the same in previews.
