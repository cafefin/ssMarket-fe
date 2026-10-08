"use client";

import { ShoppingCartSimpleIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { useCurrentUser } from "@/shared/api/use-current-user";
import { useUserMessage } from "@/shared/api/use-user-message";
import { useFormat } from "@/shared/lib/format/use-format";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/atoms/shadcn/button";
import { useInCart, useSetCartLine } from "../api/use-cart";
import { checkoutHref } from "../lib/checkout-link";
import {
  addableQuantity,
  initialQuantity,
  normalizeQuantity,
} from "../lib/purchase";
import { QuantityStepper } from "./quantity-stepper";

/** What the controls need to know about a product. */
export interface BuyableProduct {
  id: string;
  unit: string;
  /** What is left of an in-stock product; null for a pre-order. */
  stockQuantity: number | null;
  seller: { id: string };
}

/**
 * Quantity on one row, then "Add to cart" and "Buy now" on the next. The
 * quantity can never go above what is left once the cart's share is taken
 * out, so a product with one piece cannot be added twice. Sellers see
 * nothing on their own products.
 */
export function BuyControls({
  product,
  size = "card",
}: {
  product: BuyableProduct;
  /** "card" is compact, with an icon-only cart button; "page" is roomier. */
  size?: "card" | "page";
}) {
  const t = useTranslations("cart");
  const format = useFormat();
  const router = useRouter();
  const userMessage = useUserMessage();
  const { data: me } = useCurrentUser();
  const inCart = useInCart(product.id);
  const setLine = useSetCartLine();
  const left = addableQuantity(product.stockQuantity, inCart);
  const [quantity, setQuantity] = useState(() =>
    initialQuantity(product.unit, left),
  );

  if (!me || me.id === product.seller.id) {
    return null;
  }

  const soldOut = product.stockQuantity === 0;
  const amount = normalizeQuantity(quantity);
  const tooMany = amount !== null && left !== null && Number(amount) > left;
  // Buying now skips the cart, so only the stock itself limits it.
  const tooManyToBuy =
    amount !== null &&
    product.stockQuantity !== null &&
    Number(amount) > product.stockQuantity;
  const page = size === "page";

  async function add(): Promise<void> {
    if (amount === null) {
      return;
    }
    try {
      // Adding again adds to what is already in the cart.
      const total = Math.round((inCart + Number(amount)) * 1000) / 1000;
      await setLine.mutateAsync({ listingId: product.id, quantity: String(total) });
      toast.success(t("added"));
    } catch (error) {
      toast.error(userMessage(error));
    }
  }

  if (soldOut) {
    return (
      <Button type="button" variant="outline" size={page ? "default" : "sm"} disabled className="w-full">
        {t("soldOut")}
      </Button>
    );
  }

  const hint =
    left === 0
      ? t("allInCart", { quantity: format.quantity(inCart), unit: product.unit })
      : tooMany && left !== null
        ? t("onlyLeft", { quantity: format.quantity(left), unit: product.unit })
        : null;

  return (
    <div className={cn("flex flex-col", page ? "gap-3" : "gap-2")}>
      <QuantityStepper
        value={quantity}
        unit={product.unit}
        max={left === 0 ? product.stockQuantity : left}
        onChange={setQuantity}
        label={t("quantity")}
        className="w-full justify-between"
      />
      {hint && (
        <p className="text-xs text-muted-foreground" role="status">
          {hint}
          {left === 0 && (
            <>
              {" · "}
              <Link href="/cart" className="font-medium text-primary underline-offset-4 hover:underline">
                {t("viewCart")}
              </Link>
            </>
          )}
        </p>
      )}
      <div className="flex gap-2">
        {page ? (
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            disabled={amount === null || tooMany || left === 0 || setLine.isPending}
            onClick={() => void add()}
          >
            <ShoppingCartSimpleIcon aria-hidden="true" data-icon="inline-start" />
            {t("add")}
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            aria-label={t("add")}
            title={t("add")}
            disabled={amount === null || tooMany || left === 0 || setLine.isPending}
            onClick={() => void add()}
          >
            <ShoppingCartSimpleIcon aria-hidden="true" className="size-5" />
          </Button>
        )}
        <Button
          type="button"
          size={page ? "default" : "sm"}
          className={cn("flex-1", !page && "h-9")}
          disabled={amount === null || tooManyToBuy}
          onClick={() =>
            amount !== null &&
            router.push(
              checkoutHref([{ listingId: product.id, quantity: amount }], false),
            )
          }
        >
          {t("buyNow")}
        </Button>
      </div>
    </div>
  );
}
