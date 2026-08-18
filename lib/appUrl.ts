/**
 * Client-safe app-origin resolution (importable from 'use client' components).
 * MUST NOT import next/headers or next/server — those break the browser bundle.
 * Server-side helpers live in lib/appUrl.server.ts.
 *
 * Fixes: copied card URLs leaked `http://localhost:3000` because call sites did
 * `process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'` and the env var
 * is not set in any environment — and for client components the fallback is
 * inlined into the browser bundle at build time. The browser always knows the
 * real origin, so use it natively.
 */
export function clientAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (typeof window !== 'undefined') return window.location.origin;
  return 'http://localhost:3000';
}
