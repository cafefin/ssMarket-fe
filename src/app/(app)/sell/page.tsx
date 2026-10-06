import { Suspense } from "react";
import { MyListings } from "@/features/sell";

export default function MyListingsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8">
      {/* useSearchParams in the list needs a Suspense boundary. */}
      <Suspense>
        <MyListings />
      </Suspense>
    </div>
  );
}
