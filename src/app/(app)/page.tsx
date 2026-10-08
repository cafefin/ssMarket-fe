"use client";

import { Suspense } from "react";
import { BuyControls } from "@/features/cart";
import { ListingBrowser } from "@/features/listings";

/** Browse and search; the cart's controls sit under each card. */
export default function HomePage() {
  return (
    // useSearchParams in the browser needs a Suspense boundary.
    <Suspense>
      <ListingBrowser
        renderCardActions={(listing) => <BuyControls product={listing} />}
      />
    </Suspense>
  );
}
