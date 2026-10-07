"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { useClosingSoon } from "../api/use-listings";
import { ListingCard } from "./listing-card";

const MAX_ITEMS = 10;
const MIN_SLIDE = 266; // one card (250px) plus the gap

const ARROW =
  "flex size-10 items-center justify-center rounded-full border border-border bg-background text-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-disabled:cursor-default aria-disabled:text-border";

/** Pre-orders that close soonest, in a row that scrolls sideways. The server orders them (GET /listings?sort=deadline). */
export function ClosingSoonShelf() {
  const t = useTranslations("listings.shelf");
  const { data } = useClosingSoon(MAX_ITEMS);
  const row = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  const items = data ?? [];

  const sync = useCallback((): void => {
    const el = row.current;
    if (!el) {
      return;
    }
    setEdge({
      start: el.scrollLeft <= 2,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2,
    });
  }, []);

  const slide = useCallback((direction: 1 | -1): void => {
    const el = row.current;
    if (!el) {
      return;
    }
    // Smoothness comes from CSS so that reduced-motion settings apply.
    el.scrollBy({ left: direction * Math.max(MIN_SLIDE, el.clientWidth * 0.8) });
  }, []);

  const count = items.length;

  // Measure once the cards are rendered and whenever the row changes size.
  useEffect(() => {
    sync();
    const el = row.current;
    if (!el || typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => observer.disconnect();
  }, [count, sync]);

  if (count === 0) {
    return null;
  }

  return (
    <section aria-labelledby="closing-soon-title" className="bg-deadline-soft">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:px-8">
        <div className="flex items-center gap-4">
          <div className="mr-auto flex min-w-0 flex-col gap-x-4 sm:flex-row sm:items-baseline">
            <h2 id="closing-soon-title" className="text-[22px] font-bold">
              {t("title")}
            </h2>
            <p className="text-[13px] text-deadline-deep">
              {t("subtitle")}
            </p>
          </div>
          {/* Phones swipe; the buttons are for pointers and keyboards. */}
          <div className="hidden shrink-0 gap-2 min-[560px]:flex">
            <button
              type="button"
              aria-label={t("previous")}
              aria-disabled={edge.start}
              onClick={() => !edge.start && slide(-1)}
              className={ARROW}
            >
              <ChevronLeftIcon aria-hidden="true" className="size-5" />
            </button>
            <button
              type="button"
              aria-label={t("next")}
              aria-disabled={edge.end}
              onClick={() => !edge.end && slide(1)}
              className={ARROW}
            >
              <ChevronRightIcon aria-hidden="true" className="size-5" />
            </button>
          </div>
        </div>

        <ul
          ref={row}
          onScroll={sync}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth [scrollbar-width:none] motion-reduce:scroll-auto"
        >
          {items.map((listing) => (
            <li
              key={listing.id}
              className="flex w-[62vw] max-w-[250px] min-w-[200px] shrink-0 snap-start"
            >
              <ListingCard listing={listing} layout="stacked" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
