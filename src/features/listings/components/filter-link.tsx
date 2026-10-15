"use client";

import type { ComponentProps, MouseEvent } from "react";

/**
 * A link that changes the filters. It is a real link (the URL can be shared
 * or opened in a new tab), but a plain click only rewrites the URL: Next
 * keeps useSearchParams in step with pushState, so the list refetches at
 * once instead of waiting for a round trip to the server first.
 */
export function FilterLink({
  href,
  onClick,
  ...props
}: Omit<ComponentProps<"a">, "href"> & { href: string }) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    window.history.pushState(null, "", href);
  }
  return <a href={href} onClick={handleClick} {...props} />;
}
