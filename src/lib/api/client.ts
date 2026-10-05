import createClient from "openapi-fetch";
import { createAuthFetch } from "./auth-fetch";
import type { components, paths } from "./schema";

export type CurrentUser = components["schemas"]["UserResponseDto"];

const authFetch = createAuthFetch(
  (input, init) => fetch(input, init),
  () => {
    // Runs outside React, and a full page load is intended: it discards every
    // piece of client state that belonged to the expired session.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/login");
  },
);

/** Typed client for the ssMarket API. Use from client components only. */
export const api = createClient<paths>({
  baseUrl: `${globalThis.location?.origin ?? ""}/api`,
  fetch: authFetch,
});
