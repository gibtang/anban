import { NextRequest } from 'next/server';
import { headers } from 'next/headers';

/**
 * Server-only app-origin resolution (route handlers + RSC).
 * Importing this from a client component breaks the browser bundle — keep it
 * out of 'use client' graphs; client code uses lib/appUrl.ts instead.
 *
 * NEXT_PUBLIC_APP_URL remains an explicit override when set, but the fallback
 * derives the real origin natively from the incoming request.
 */

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
