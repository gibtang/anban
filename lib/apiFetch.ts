import { getLoadingCallbacks } from '@/app/contexts/LoadingContext';

const DEBOUNCE_MS = 300;

/**
 * Centralized fetch wrapper with 300ms-debounced loading overlay.
 * Drop-in replacement for native fetch().
 */
export default async function apiFetch(
  input: string | URL | Request,
  init?: RequestInit,
): Promise<Response> {
  const callbacks = getLoadingCallbacks();

  let timer: ReturnType<typeof setTimeout> | null = null;
  let overlayShown = false;

  if (callbacks) {
    timer = setTimeout(() => {
      callbacks.increment();
      overlayShown = true;
    }, DEBOUNCE_MS);
  }

  try {
    const response = await fetch(input, init);
    return response;
  } finally {
    if (timer) clearTimeout(timer);
    if (overlayShown && callbacks) {
      callbacks.decrement();
    }
  }
}

// --- Convenience methods ---

type BodylessMethod = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

type BodyMethod = (
  input: string | URL | Request,
  body?: BodyInit | null,
  init?: RequestInit,
) => Promise<Response>;

function withoutBody(method: string): BodylessMethod {
  return (input, init) => apiFetch(input, { ...init, method });
}

function withBody(method: string): BodyMethod {
  return (input, body, init) =>
    apiFetch(input, { ...init, method, body });
}

export const get = withoutBody('GET');
export const del = withoutBody('DELETE');
export const head = withoutBody('HEAD');
export const options = withoutBody('OPTIONS');
export const post = withBody('POST');
export const put = withBody('PUT');
export const patch = withBody('PATCH');
