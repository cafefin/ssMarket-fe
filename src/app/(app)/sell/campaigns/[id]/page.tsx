"use client";

import { useParams } from "next/navigation";
import { CampaignSummary } from "@/features/orders";

export default function CampaignSummaryPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
      <CampaignSummary campaignId={id} />
    </div>
  );
}
