"use client";

import { useParams } from "next/navigation";
import { EditListing } from "@/components/sell/edit-listing";

export default function EditListingPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
      <EditListing id={id} />
    </div>
  );
}
