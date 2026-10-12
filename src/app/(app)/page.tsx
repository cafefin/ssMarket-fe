"use client";

import { Suspense } from "react";
import { BuyControls } from "@/features/cart";
import { CampaignGrid, CampaignShelf } from "@/features/campaigns";
import { ListingBrowser } from "@/features/listings";

/**
 * Browse and search; the cart's controls sit under each card, and rounds of
 * pre-orders come from the campaigns feature.
 */
export default function HomePage() {
  return (
    // useSearchParams in the browser needs a Suspense boundary.
    <Suspense>
      <ListingBrowser
        renderCardActions={(listing) => <BuyControls product={listing} />}
        shelf={<CampaignShelf />}
        renderCampaigns={(filters) => (
          <CampaignGrid
            filters={{
              q: filters.q,
              category: filters.category,
              minPrice: filters.minPrice,
              maxPrice: filters.maxPrice,
            }}
          />
        )}
      />
    </Suspense>
  );
}
