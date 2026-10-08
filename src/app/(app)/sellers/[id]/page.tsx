"use client";

import { useParams } from "next/navigation";
import { BuyControls } from "@/features/cart";
import { SellerProfile } from "@/features/sellers";

export default function SellerPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <SellerProfile
      sellerId={id}
      renderCardActions={(listing) => <BuyControls product={listing} />}
    />
  );
}
