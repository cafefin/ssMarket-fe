"use client";

import { ShoppingCartSimpleIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import type { ListingSummary } from "@/features/listings";
import { useCurrentUser } from "@/shared/api/use-current-user";
import { useUserMessage } from "@/shared/api/use-user-message";
import { Button, buttonVariants } from "@/shared/ui/atoms/shadcn/button";
import { useCart, useSetCartLine } from "../api/use-cart";
import { checkoutHref } from "../lib/checkout-link";
import { QuantityStepper } from "./quantity-stepper";

/**
 * Buy from the list page: a single-option product gets a quantity, "Add to
 * cart" and "Buy now"; a product with several options links to its page to
 * choose one. Sellers see nothing on their own products.
 */
export function CardCartActions({ listing }: { listing: ListingSummary }) {
  const t = useTranslations("cart");
  const router = useRouter();
  const userMessage = useUserMessage();
  const { data: me } = useCurrentUser();
  const { data: cart } = useCart();
  const setLine = useSetCartLine();
  const unit = listing.minPriceUnit;
  const [quantity, setQuantity] = useState(unit === "kg" ? "0.5" : "1");

  if (!me || me.id === listing.seller.id) {
    return null;
  }
  const itemId = listing.singleItemId;
  if (!itemId) {
    return (
      <Link
        href={`/listings/${listing.id}`}
        className={buttonVariants({ variant: "outline", size: "sm", className: "w-full" })}
      >
        {t("chooseOption")}
      </Link>
    );
  }

  const soldOut = listing.stockQuantity === 0;
  const normalized = quantity.trim().replace(",", ".");
  const valid = /^\d{1,7}(\.\d{1,3})?$/.test(normalized) && Number(normalized) > 0;
  const inCart = cart?.groups
    .flatMap((group) => group.lines)
    .find((line) => line.itemId === itemId)?.quantity;

  async function add(): Promise<void> {
    if (!itemId) {
      return;
    }
    try {
      // Adding again adds to what is already in the cart.
      const total = Math.round(((inCart ?? 0) + Number(normalized)) * 1000) / 1000;
      await setLine.mutateAsync({ itemId, quantity: String(total) });
      toast.success(t("added"));
    } catch (error) {
      toast.error(userMessage(error));
    }
  }

  return (
    <div className="flex items-center gap-2">
      <QuantityStepper
        value={quantity}
        unit={unit}
        max={listing.stockQuantity}
        onChange={setQuantity}
        disabled={soldOut}
        label={t("quantity")}
      />
      <Button
        type="button"
        variant="outline"
        size="icon-lg"
        aria-label={t("add")}
        title={t("add")}
        disabled={soldOut || !valid || setLine.isPending}
        onClick={() => void add()}
      >
        <ShoppingCartSimpleIcon aria-hidden="true" className="size-5" />
      </Button>
      <Button
        type="button"
        size="sm"
        className="ml-auto h-9"
        disabled={soldOut || !valid}
        onClick={() =>
          router.push(checkoutHref([{ itemId, quantity: normalized }], false))
        }
      >
        {t("buyNow")}
      </Button>
    </div>
  );
}
