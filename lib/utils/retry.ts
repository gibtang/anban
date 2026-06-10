import apiFetch from '@/lib/apiFetch';

interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  retryOn?: (error: Error) => boolean;
}

export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retryOptions: RetryOptions = {}
): Promise<Response> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    retryOn = (error) => error.message.includes('fetch') || error.message.includes('network'),
  } = retryOptions;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await apiFetch(url, options);

      // Retry on 5xx errors and network errors
      if (!response.ok && response.status >= 500 && attempt < maxRetries) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        lastError = error;

        if (retryOn(error)) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
          continue;
        }
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries && retryOn(lastError)) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
        continue;
      }

      throw lastError;
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

export async function fetchJsonWithRetry<T>(
  url: string,
  options?: RequestInit,
  retryOptions?: RetryOptions
): Promise<T> {
  const response = await fetchWithRetry(url, options, retryOptions);
  return response.json() as Promise<T>;
}
