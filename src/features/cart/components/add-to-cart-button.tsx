"use client";

import { ShoppingCartSimpleIcon } from "@phosphor-icons/react/ssr";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useUserMessage } from "@/shared/api/use-user-message";
import { Button } from "@/shared/ui/atoms/shadcn/button";
import { useCart, useSetCartLine } from "../api/use-cart";

/**
 * "Add to cart" for the quantities typed in the order panel of a listing.
 * Adds to what is already in the cart.
 */
export function AddToCartButton({
  lines,
}: {
  lines: { itemId: string; quantity: string }[];
}) {
  const t = useTranslations("cart");
  const userMessage = useUserMessage();
  const { data: cart } = useCart();
  const setLine = useSetCartLine();

  async function add(): Promise<void> {
    const current = new Map(
      (cart?.groups ?? [])
        .flatMap((group) => group.lines)
        .map((line) => [line.itemId, line.quantity]),
    );
    try {
      for (const line of lines) {
        const total =
          Math.round(
            ((current.get(line.itemId) ?? 0) + Number(line.quantity)) * 1000,
          ) / 1000;
        await setLine.mutateAsync({ itemId: line.itemId, quantity: String(total) });
      }
      toast.success(t("added"));
    } catch (error) {
      toast.error(userMessage(error));
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      disabled={lines.length === 0 || setLine.isPending}
      onClick={() => void add()}
    >
      <ShoppingCartSimpleIcon aria-hidden="true" data-icon="inline-start" />
      {t("add")}
    </Button>
  );
}
