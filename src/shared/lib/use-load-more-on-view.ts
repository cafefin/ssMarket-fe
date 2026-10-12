import { type RefObject, useEffect, useRef } from "react";

/**
 * Calls `fetchNextPage` when the returned ref's element comes near the
 * viewport. Returns the ref to put on the element at the end of the list.
 */
export function useLoadMoreOnView<T extends Element>({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => unknown;
}): RefObject<T | null> {
  const end = useRef<T>(null);
  useEffect(() => {
    const element = end.current;
    if (!element || !hasNextPage || typeof IntersectionObserver === "undefined") {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
  return end;
}
