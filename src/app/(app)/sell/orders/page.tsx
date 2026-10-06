import { Suspense } from "react";
import { SalesList } from "@/components/orders/sales-list";

export default function SalesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
      {/* useSearchParams in the list needs a Suspense boundary. */}
      <Suspense>
        <SalesList />
      </Suspense>
    </div>
  );
}
