import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLoadMoreOnView } from "./use-load-more-on-view";

type Callback = (entries: Array<{ isIntersecting: boolean }>) => void;

let callbacks: Callback[];
let observe: ReturnType<typeof vi.fn>;
let disconnect: ReturnType<typeof vi.fn>;

beforeEach(() => {
  callbacks = [];
  observe = vi.fn();
  disconnect = vi.fn();
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: Callback) {
        callbacks.push(callback);
      }
      observe = observe;
      disconnect = disconnect;
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function Probe(props: {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => unknown;
}) {
  const ref = useLoadMoreOnView<HTMLDivElement>(props);
  return <div ref={ref} />;
}

describe("useLoadMoreOnView", () => {
  it("watches the end of the list only while there is a next page", () => {
    const fetchNextPage = vi.fn();
    const { rerender } = render(
      <Probe hasNextPage={false} isFetchingNextPage={false} fetchNextPage={fetchNextPage} />,
    );
    expect(callbacks).toHaveLength(0);

    rerender(
      <Probe hasNextPage isFetchingNextPage={false} fetchNextPage={fetchNextPage} />,
    );
    expect(callbacks).toHaveLength(1);
    expect(observe).toHaveBeenCalledTimes(1);
  });

  it("fetches the next page when the end comes into view", () => {
    const fetchNextPage = vi.fn();
    render(
      <Probe hasNextPage isFetchingNextPage={false} fetchNextPage={fetchNextPage} />,
    );

    callbacks[0]([{ isIntersecting: false }]);
    expect(fetchNextPage).not.toHaveBeenCalled();
    callbacks[0]([{ isIntersecting: true }]);
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it("does not fetch while a page is already loading", () => {
    const fetchNextPage = vi.fn();
    render(
      <Probe hasNextPage isFetchingNextPage fetchNextPage={fetchNextPage} />,
    );

    callbacks[0]([{ isIntersecting: true }]);
    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it("disconnects on unmount", () => {
    const { unmount } = render(
      <Probe hasNextPage isFetchingNextPage={false} fetchNextPage={vi.fn()} />,
    );
    expect(disconnect).not.toHaveBeenCalled();
    unmount();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it("does nothing in a browser without IntersectionObserver", () => {
    vi.unstubAllGlobals();
    vi.stubGlobal("IntersectionObserver", undefined);
    expect(() =>
      render(
        <Probe hasNextPage isFetchingNextPage={false} fetchNextPage={vi.fn()} />,
      ),
    ).not.toThrow();
  });
});
