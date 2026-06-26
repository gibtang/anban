# syntax=docker/dockerfile:1
# Multi-stage build for Anban (Next.js 16 + Prisma/MongoDB + Firebase).
# Secrets are NOT baked in — Coolify injects env vars at runtime.

# ---- 1. Full deps (needed to build) ----
FROM node:22-alpine AS deps
WORKDIR /app
# Copy lockfile + manifests first for layer caching, then prisma schema
# (postinstall runs `prisma generate`, which needs the schema present).
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci

# ---- 2. Build the Next.js app ----
FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- 3. Production deps (slim; keeps next + prisma + @prisma/client) ----
FROM node:22-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npm cache clean --force

# ---- 4. Runtime ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Production dependencies (incl. generated Prisma client)
COPY --from=prod-deps /app/node_modules ./node_modules
# Built Next.js output + static assets + config
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
# Prisma schema (some drivers read it at runtime)
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000
# `next start` (package.json "start": "next start") listens on $PORT
CMD ["npm", "run", "start"]
