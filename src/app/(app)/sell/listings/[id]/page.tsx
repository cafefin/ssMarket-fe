"use client";

import { useParams } from "next/navigation";
import { SalesSummary } from "@/components/orders/sales-summary";

export default function SalesSummaryPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
      <SalesSummary listingId={id} />
    </div>
  );
}
