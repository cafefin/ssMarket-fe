"use client";

import { useParams } from "next/navigation";
import { SellerProfile } from "@/features/sellers";

export default function SellerPage() {
  const { id } = useParams<{ id: string }>();
  return <SellerProfile sellerId={id} />;
}
