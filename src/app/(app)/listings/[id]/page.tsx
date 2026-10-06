"use client";

import { useParams } from "next/navigation";
import { ListingDetailView } from "@/features/listings";

export default function ListingPage() {
  const { id } = useParams<{ id: string }>();
  return <ListingDetailView id={id} />;
}
