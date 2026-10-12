import { Suspense } from "react";
import { MyCampaigns, MyListings } from "@/features/sell";

export default function MyListingsPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-12 px-4 py-8 sm:px-8">
      {/* useSearchParams in both lists needs a Suspense boundary. */}
      <Suspense>
        <MyCampaigns />
        <MyListings />
      </Suspense>
    </div>
  );
}
