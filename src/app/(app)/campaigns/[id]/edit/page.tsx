"use client";

import { useParams } from "next/navigation";
import { Suspense } from "react";
import { EditCampaign } from "@/features/sell";

export default function EditCampaignPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
      {/* useSearchParams in the editor needs a Suspense boundary. */}
      <Suspense>
        <EditCampaign id={id} />
      </Suspense>
    </div>
  );
}
