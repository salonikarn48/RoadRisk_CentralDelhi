/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * RoadRisk Delhi - Client Resilience Utility
 * Module: resilientFetch.ts
 * Wraps fetch with a 10s timeout and 1 automatic retry before failing cleanly.
 */

export interface ResilientFetchOptions extends RequestInit {
  timeoutMs?: number;
  maxRetries?: number;
}

export async function resilientFetch(
  url: string,
  options: ResilientFetchOptions = {}
): Promise<Response> {
  const { timeoutMs = 10000, maxRetries = 1, ...init } = options;

  let lastError: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (response.ok) {
        return response;
      }

      // If server returned 5xx, retry once
      if (response.status >= 500 && attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 400));
        continue;
      }

      return response;
    } catch (err: any) {
      lastError = err;
      if (attempt < maxRetries) {
        // Wait 400ms before retry
        await new Promise((r) => setTimeout(r, 400));
      }
    }
  }

  throw new Error(
    lastError?.name === "AbortError"
      ? `Request to ${url} timed out after ${timeoutMs}ms. Check network connection.`
      : lastError?.message || `Failed to fetch from ${url}.`
  );
}
