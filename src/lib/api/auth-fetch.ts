const REFRESH_URL = "/api/auth/refresh";

/**
 * Wraps fetch so that a 401 triggers one session refresh followed by one
 * retry of the original request. Requests that fail at the same moment share
 * a single refresh, because the backend rotates the refresh token on every
 * use and a second refresh with the old token would be rejected.
 */
export function createAuthFetch(
  baseFetch: typeof fetch,
  onAuthFailure: () => void,
): typeof fetch {
  let refreshing: Promise<boolean> | null = null;

  const refresh = (): Promise<boolean> => {
    refreshing ??= baseFetch(REFRESH_URL, { method: "POST" })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
        refreshing = null;
      });
    return refreshing;
  };

  return async (input, init) => {
    const request = new Request(input, init);
    // A request body can be read only once, so keep a copy for the retry.
    const retry = request.clone();

    const response = await baseFetch(request);
    if (response.status !== 401) {
      return response;
    }

    if (!(await refresh())) {
      onAuthFailure();
      return response;
    }

    return baseFetch(retry);
  };
}
