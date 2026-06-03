'use client';

import { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react';

// Module-level callbacks so plain functions (like apiFetch) can call
// increment/decrement without needing a React hook.
type LoadingCallbacks = {
  increment: () => void;
  decrement: () => void;
};

let _callbacks: LoadingCallbacks | null = null;

export function setLoadingCallbacks(callbacks: LoadingCallbacks | null) {
  _callbacks = callbacks;
}

export function getLoadingCallbacks(): LoadingCallbacks | null {
  return _callbacks;
}

interface LoadingContextValue {
  loadingCount: number;
  incrementLoading: () => void;
  decrementLoading: () => void;
}

const LoadingContext = createContext<LoadingContextValue>({
  loadingCount: 0,
  incrementLoading: () => {},
  decrementLoading: () => {},
});

export function useLoading() {
  return useContext(LoadingContext);
}

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [loadingCount, setLoadingCount] = useState(0);
  const countRef = useRef(0);

  const incrementLoading = useCallback(() => {
    countRef.current += 1;
    setLoadingCount(countRef.current);
  }, []);

  const decrementLoading = useCallback(() => {
    countRef.current = Math.max(0, countRef.current - 1);
    setLoadingCount(countRef.current);
  }, []);

  // Register callbacks once for module-level access
  useEffect(() => {
    setLoadingCallbacks({ increment: incrementLoading, decrement: decrementLoading });
    return () => {
      setLoadingCallbacks(null);
    };
  }, [incrementLoading, decrementLoading]);

  return (
    <LoadingContext.Provider value={{ loadingCount, incrementLoading, decrementLoading }}>
      {children}
    </LoadingContext.Provider>
  );
}
