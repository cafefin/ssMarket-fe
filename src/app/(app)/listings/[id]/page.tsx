"use client";

import { useParams } from "next/navigation";
import { BuyControls } from "@/features/cart";
import { ListingDetailView } from "@/features/listings";

/** The only place the product page and the cart meet. */
export default function ListingPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <ListingDetailView
      id={id}
      renderBuy={(listing) => <BuyControls product={listing} size="page" />}
    />
  );
}
