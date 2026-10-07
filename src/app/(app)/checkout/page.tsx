import { Suspense } from "react";
import { CheckoutPage } from "@/features/cart";

export default function Checkout() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
      {/* useSearchParams in the page needs a Suspense boundary. */}
      <Suspense>
        <CheckoutPage />
      </Suspense>
    </div>
  );
}
