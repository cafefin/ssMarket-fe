"use client";

import { useParams } from "next/navigation";
import { OrderView } from "@/features/orders";

export default function OrderPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-8">
      <OrderView id={id} />
    </div>
  );
}
