"use client";

import { ShoppingCartSimpleIcon } from "@phosphor-icons/react/ssr";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useCurrentUser } from "@/shared/api/use-current-user";
import { useUserMessage } from "@/shared/api/use-user-message";
import { Price } from "@/shared/ui/atoms/price";
import { Button } from "@/shared/ui/atoms/shadcn/button";
import { roundQuantity } from "@/shared/lib/quantity-step";
import { type CheckoutLine, useCart, useSetCartLines } from "../api/use-cart";
import { checkoutHref } from "../lib/checkout-link";

/**
 * What is chosen in a pre-order round and the two ways to buy it: everything
 * into the cart in one request, or straight to the checkout, where the
 * round becomes one order. The seller of the round sees nothing.
 */
export function CampaignBuyBar({
  sellerId,
  lines,
  total,
  valid,
  onAdded,
}: {
  sellerId: string;
  /** The chosen products, with quantities the API takes. */
  lines: CheckoutLine[];
  /** Integer VND for the lines, combos applied. */
  total: number;
  /** False while a chosen quantity cannot be ordered. */
  valid: boolean;
  /** Called once the lines are in the cart. */
  onAdded: () => void;
}) {
  const t = useTranslations("cart");
  const tc = useTranslations("common");
  const router = useRouter();
  const userMessage = useUserMessage();
  const { data: me } = useCurrentUser();
  const cartQuery = useCart();
  const cart = cartQuery.data;
  const setLines = useSetCartLines();

  if (!me || me.id === sellerId) {
    return null;
  }

  const nothing = lines.length === 0 || !valid;

  async function add(): Promise<void> {
    if (!cart) {
      return;
    }
    const held = new Map(
      cart.groups
        .flatMap((group) => group.lines)
        .map((line) => [line.listingId, line.quantity]),
    );
    try {
      // The API replaces a line's quantity; adding means on top of the cart's.
      await setLines.mutateAsync(
        lines.map((line) => ({
          listingId: line.listingId,
          quantity: String(
            roundQuantity((held.get(line.listingId) ?? 0) + Number(line.quantity)),
          ),
        })),
      );
      toast.success(t("added"));
      onAdded();
    } catch (error) {
      toast.error(userMessage(error));
    }
  }

  return (
    <section
      aria-label={t("campaignBar.label")}
      className="flex flex-col gap-2 rounded-lg border border-border bg-background p-3 shadow-lg"
    >
      {cartQuery.isError && (
        // Adding needs what the cart already holds; buying now does not.
        <p
          role="alert"
          className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-error-deep"
        >
          <span>
            {t("campaignBar.cartFailed")} {userMessage(cartQuery.error)}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={cartQuery.isFetching}
            onClick={() => void cartQuery.refetch()}
          >
            {tc("retry")}
          </Button>
        </p>
      )}
      <div className="flex flex-col gap-2 min-[560px]:flex-row min-[560px]:items-center min-[560px]:justify-between">
        <p className="text-sm" aria-live="polite">
          {lines.length === 0 ? (
            <span className="text-muted-foreground">{t("campaignBar.none")}</span>
          ) : (
            <>
              {t("campaignBar.selected", { count: lines.length })}
              {" · "}
              <Price amount={total} />
            </>
          )}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1 min-[560px]:flex-none"
            disabled={nothing || !cart || setLines.isPending}
            onClick={() => void add()}
          >
            <ShoppingCartSimpleIcon aria-hidden="true" data-icon="inline-start" />
            {t("add")}
          </Button>
          <Button
            type="button"
            className="flex-1 min-[560px]:flex-none"
            disabled={nothing}
            onClick={() => router.push(checkoutHref(lines, false))}
          >
            {t("buyNow")}
          </Button>
        </div>
      </div>
    </section>
  );
}
