import { Suspense } from "react";
import { ListingBrowser } from "@/components/listings/listing-browser";

export default function HomePage() {
  return (
    // useSearchParams in the browser needs a Suspense boundary.
    <Suspense>
      <ListingBrowser />
    </Suspense>
  );
}
