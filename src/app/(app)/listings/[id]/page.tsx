"use client";

import { useParams } from "next/navigation";
import { ListingDetailView } from "@/components/listings/listing-detail-view";

export default function ListingPage() {
  const { id } = useParams<{ id: string }>();
  return <ListingDetailView id={id} />;
}
