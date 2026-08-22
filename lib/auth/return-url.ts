/**
 * Return-URL ("next") handling for post-auth redirects.
 *
 * Flow: when an unauthenticated user hits a protected route, proxy.ts redirects
 * to /login?next=<original path+query>. Login/signup mirror the param into
 * sessionStorage (so the intent survives navigations that drop the URL param,
 * e.g. the password-reset email round trip) and honor it after auth.
 *
 * Security (open-redirect prevention): the ONLY writer of `next` is our own
 * proxy/server code. Regardless, every read is validated — a value is honored
 * only if it is a relative path (starts with a single `/`), never a protocol-
 * relative URL (`//evil.com`), absolute URL (`https://evil.com`), or malformed
 * input (`/%5Cevil.com` backslash tricks).
 */

const STORAGE_KEY = 'anban.auth.returnUrl';

/** Returns the value if it is a safe same-site relative path, else null. */
export function safeReturnUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  // Decode %-escapes once so encoded absolute URLs (https%3A%2F%2F…) can't
  // sneak through; malformed sequences (%, %ZZ) throw and are rejected.
  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return null;
  }
  if (!decoded.startsWith('/')) return null;
  if (decoded.startsWith('//') || decoded.startsWith('/\\')) return null;
  // Reject anything that resolves to an absolute URL via the URL parser
  // (covers backslash normalization and other parser quirks).
  try {
    const parsed = new URL(decoded, 'https://anban.local');
    if (parsed.origin !== 'https://anban.local') return null;
  } catch {
    return null;
  }
  return decoded;
}

/** Persist a validated return URL so it survives full navigations. */
export function saveReturnUrl(value: string | null | undefined): void {
  if (typeof window === 'undefined') return;
  const safe = safeReturnUrl(value);
  if (safe) {
    window.sessionStorage.setItem(STORAGE_KEY, safe);
  } else {
    window.sessionStorage.removeItem(STORAGE_KEY);
  }
}

/** Retrieve the stored return URL (validated), or null. */
export function loadReturnUrl(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return safeReturnUrl(window.sessionStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

/** Clear the stored return URL — call after consuming it or on logout. */
export function clearReturnUrl(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // sessionStorage unavailable (private mode) — nothing to clear
  }
}
