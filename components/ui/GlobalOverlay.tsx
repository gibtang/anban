'use client';

import { useEffect, useRef, useState } from 'react';
import { useLoading } from '@/app/contexts/LoadingContext';

export function GlobalOverlay() {
  const { loadingCount } = useLoading();
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (loadingCount > 0) {
      // Start a 300ms delay before showing the overlay
      if (!timerRef.current && !visible) {
        timerRef.current = setTimeout(() => {
          setVisible(true);
          timerRef.current = null;
        }, 300);
      }
    } else {
      // Loading done — clear any pending timer and hide immediately
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setVisible(false);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [loadingCount, visible]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center transition-opacity duration-200 animate-fade-in"
      aria-hidden="true"
    >
      <svg
        className="animate-spin h-10 w-10 text-white"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
}
