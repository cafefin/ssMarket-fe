"use client";

import { useParams } from "next/navigation";
import { AddToCartButton } from "@/features/cart";
import { ListingDetailView } from "@/features/listings";
import { OrderPanel } from "@/features/orders";

/** The only place the listing page, the order panel and the cart meet. */
export default function ListingPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <ListingDetailView
      id={id}
      renderOrderPanel={(listing) => (
        <OrderPanel
          listing={listing}
          renderSecondaryAction={(lines) => <AddToCartButton lines={lines} />}
        />
      )}
    />
  );
}
