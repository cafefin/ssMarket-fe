"use client";

import { useParams } from "next/navigation";
import { Suspense } from "react";
import { EditListing } from "@/components/sell/edit-listing";

export default function EditListingPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
      {/* useSearchParams in the editor needs a Suspense boundary. */}
      <Suspense>
        <EditListing id={id} />
      </Suspense>
    </div>
  );
}
