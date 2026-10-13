import { Suspense } from "react";
import { MySelling } from "@/features/sell";

export default function MyListingsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8">
      {/* useSearchParams in both lists needs a Suspense boundary. */}
      <Suspense>
        <MySelling />
      </Suspense>
    </div>
  );
}
