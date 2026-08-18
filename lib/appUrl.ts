import { NextRequest } from 'next/server';
import { headers } from 'next/headers';

/**
 * Canonical app-origin resolution.
 *
 * Fixes: copied card URLs (and share/join URLs) leaked `http://localhost:3000`
 * because every call site did `process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'`
 * and NEXT_PUBLIC_APP_URL is not set in any environment (Dockerfile, CI, Coolify) —
 * and for client components the fallback is inlined into the browser bundle at
 * build time.
 *
 * NEXT_PUBLIC_APP_URL remains an explicit override when set, but the fallbacks
 * now derive the real origin natively:
 *  - client components: window.location.origin (the browser knows the host)
 *  - route handlers:    the incoming request origin (respects x-forwarded-* behind the proxy)
 *  - server components: forwarded request headers
 */

/** Client components (click handlers) — window is always available there. */
export function clientAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (typeof window !== 'undefined') return window.location.origin;
  return 'http://localhost:3000';
}

/** Route handlers — derive from the request, proxy-aware. */
export function requestAppUrl(request: NextRequest): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  return request.nextUrl.origin;
}

/** Server components (RSC) — no request object; use forwarded headers. */
export async function serverAppUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  const h = await headers();
  const host = h.get('x-forwarded-host') || h.get('host');
  if (host) {
    const isLocal = host.startsWith('localhost') || host.startsWith('127.');
    const proto = h.get('x-forwarded-proto') || (isLocal ? 'http' : 'https');
    return `${proto}://${host}`;
  }
  return 'http://localhost:3000';
}
