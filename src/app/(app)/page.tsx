"use client";

import { Suspense } from "react";
import { CardCartActions } from "@/features/cart";
import { ListingBrowser } from "@/features/listings";

/** Browse and search; the cart's controls sit under each card. */
export default function HomePage() {
  return (
    // useSearchParams in the browser needs a Suspense boundary.
    <Suspense>
      <ListingBrowser
        renderCardActions={(listing) => <CardCartActions listing={listing} />}
      />
    </Suspense>
  );
}
