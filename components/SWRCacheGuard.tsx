'use client';

import { useEffect, useRef } from 'react';
import { useSWRConfig } from 'swr';
import { useAuth } from '@/app/contexts/AuthContext';

/**
 * Clears the entire SWR cache when the authenticated user changes.
 * Prevents User B from briefly seeing User A's cached data after login.
 */
export function SWRCacheGuard() {
  const { user } = useAuth();
  const { mutate } = useSWRConfig();
  const prevUidRef = useRef<string | null>(null);

  useEffect(() => {
    const currentUid = user?.uid ?? null;

    // Skip first render — no stale cache to clear
    if (prevUidRef.current === null) {
      prevUidRef.current = currentUid;
      return;
    }

    // User changed (or logged out) — flush stale cache
    if (currentUid !== prevUidRef.current) {
      mutate(() => true, undefined, { revalidate: false });
      prevUidRef.current = currentUid;
    }
  }, [user?.uid, mutate]);

  return null;
}
