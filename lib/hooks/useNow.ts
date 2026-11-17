'use client';

import { useEffect, useState } from 'react';

/**
 * Wall-clock ms snapshot, captured right after mount so render stays pure.
 * Null during SSR and on the very first client render.
 */
export function useNow(): number | null {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => setNow(Date.now()));
    return () => cancelAnimationFrame(id);
  }, []);

  return now;
}
