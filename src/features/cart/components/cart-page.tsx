"use client";

import { TrashIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { nextCombo } from "@/features/listings";
import { useUserMessage } from "@/shared/api/use-user-message";
import { useFormat } from "@/shared/lib/format/use-format";
import { cn } from "@/shared/lib/utils";
import { Price } from "@/shared/ui/atoms/price";
import { Button, buttonVariants } from "@/shared/ui/atoms/shadcn/button";
import { Skeleton } from "@/shared/ui/atoms/shadcn/skeleton";
import { UserAvatar } from "@/shared/ui/molecules/user-avatar";
import {
  type CartLine,
  useCart,
  useRemoveCartLine,
  useSetCartLine,
} from "../api/use-cart";
import { checkoutHref } from "../lib/checkout-link";
import { QuantityStepper } from "./quantity-stepper";

const DECIMAL = /^\d{1,7}(\.\d{1,3})?$/;

function Line({
  line,
  selected,
  onToggle,
}: {
  line: CartLine;
  selected: boolean;
  onToggle: () => void;
}) {
  const t = useTranslations("cart");
  const tp = useTranslations("orders.panel");
  const format = useFormat();
  const userMessage = useUserMessage();
  const setLine = useSetCartLine();
  const remove = useRemoveCartLine();
  const [quantity, setQuantity] = useState(String(line.quantity));
  const name = line.title;
  const hint = line.problem ? null : nextCombo(line.combos, String(line.quantity));

  function change(value: string): void {
    setQuantity(value);
    const normalized = value.trim().replace(",", ".");
    if (DECIMAL.test(normalized) && Number(normalized) > 0) {
      setLine.mutate(
        { listingId: line.listingId, quantity: normalized },
        {
          onError: (error) => {
            toast.error(userMessage(error));
            setQuantity(String(line.quantity));
          },
        },
      );
    }
  }

  return (
    <li className="grid grid-cols-[auto_64px_minmax(0,1fr)] gap-3 border-t border-hairline-soft py-3">
      <input
        type="checkbox"
        className="mt-6 size-4 accent-primary"
        aria-label={t("selectLine", { name })}
        checked={selected}
        disabled={line.problem !== null}
        onChange={onToggle}
      />
      {line.thumbnailUrl ? (
        // Session-protected media; see listing-card.tsx.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={line.thumbnailUrl}
          alt=""
          className="size-16 rounded-md border border-border object-cover"
        />
      ) : (
        <div className="size-16 rounded-md bg-surface" />
      )}
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/listings/${line.listingId}`}
            className="line-clamp-2 font-medium hover:text-primary"
          >
            {name}
          </Link>
          <button
            type="button"
            aria-label={t("remove", { name })}
            onClick={() =>
              remove.mutate(line.listingId, {
                onSuccess: () => toast.success(t("removed")),
                onError: (error) => toast.error(userMessage(error)),
              })
            }
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-surface hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <TrashIcon aria-hidden="true" className="size-4" />
          </button>
        </div>
        <p className="text-[13px] text-muted-foreground">
          {t("unitPrice", { price: format.money(line.unitPrice), unit: line.unit })}
          {line.mode === "preorder" && line.orderDeadline && (
            <span className="ml-2 rounded-full bg-deadline-soft px-2 py-0.5 text-deadline-deep">
              {t("preorderCloses", {
                deadline: format.deadline(line.orderDeadline),
              })}
            </span>
          )}
        </p>
        {line.problem && (
          <p role="alert" className="text-[13px] text-error-deep">
            {line.problem === "OUT_OF_STOCK"
              ? t("problem.OUT_OF_STOCK", {
                  available: format.quantity(line.stockQuantity ?? 0),
                  unit: line.unit,
                })
              : t(`problem.${line.problem}`)}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <QuantityStepper
            value={quantity}
            unit={line.unit}
            max={line.stockQuantity}
            onChange={change}
            disabled={line.problem === "LISTING_NOT_OPEN"}
            label={t("quantity")}
          />
          <p className="text-right">
            <Price amount={line.lineTotal} />
            {line.listTotal > line.lineTotal && (
              <span className="block text-[13px] text-muted-foreground line-through">
                {format.money(line.listTotal)}
              </span>
            )}
          </p>
        </div>
        {hint && (
          <p className="text-[13px] text-primary-deep">
            {tp("comboHint", {
              missing: format.quantity(hint.missing),
              quantity: format.quantity(Number(hint.combo.quantity)),
              unit: line.unit,
              price: format.money(hint.combo.price),
            })}
          </p>
        )}
      </div>
    </li>
  );
}

/** The cart, grouped by seller, with a total of what is selected. */
export function CartPage() {
  const t = useTranslations("cart");
  const tc = useTranslations("common");
  const router = useRouter();
  const { data: cart, isPending, isError, refetch } = useCart();
  // Lines the person unticked; everything buyable starts ticked.
  const [unselected, setUnselected] = useState<Set<string>>(new Set());

  if (isPending) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true" aria-label={t("loading")}>
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    );
  }
  if (isError || !cart) {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 py-12">
        <p className="text-error-deep">{t("loadFailed")}</p>
        <Button variant="outline" onClick={() => void refetch()}>
          {tc("retry")}
        </Button>
      </div>
    );
  }

  const lines = cart.groups.flatMap((group) => group.lines);
  const isSelected = (line: CartLine) =>
    line.problem === null && !unselected.has(line.listingId);
  const selected = lines.filter(isSelected);
  const total = selected.reduce((sum, line) => sum + line.lineTotal, 0);

  function toggle(ids: string[], select: boolean): void {
    setUnselected((current) => {
      const next = new Set(current);
      for (const id of ids) {
        if (select) {
          next.delete(id);
        } else {
          next.add(id);
        }
      }
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-6 pb-28 md:pb-24">
      <h1 className="text-[28px] leading-tight font-semibold">{t("title")}</h1>

      {lines.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-muted-foreground">{t("empty")}</p>
          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            {t("browse")}
          </Link>
        </div>
      ) : (
        cart.groups.map((group) => {
          const buyable = group.lines.filter((line) => line.problem === null);
          const all = buyable.length > 0 && buyable.every(isSelected);
          return (
            <section
              key={group.seller.id}
              aria-label={group.seller.name}
              className="rounded-lg border border-border px-4"
            >
              <header className="flex items-center gap-3 py-3">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  aria-label={t("selectGroup", { name: group.seller.name })}
                  checked={all}
                  disabled={buyable.length === 0}
                  onChange={() =>
                    toggle(
                      buyable.map((line) => line.listingId),
                      !all,
                    )
                  }
                />
                <UserAvatar
                  name={group.seller.name}
                  avatarUrl={group.seller.avatarUrl}
                  size="xs"
                />
                <Link
                  href={`/sellers/${group.seller.id}`}
                  className="font-semibold hover:text-primary"
                >
                  {group.seller.name}
                </Link>
              </header>
              <ul>
                {group.lines.map((line) => (
                  <Line
                    key={line.listingId}
                    line={line}
                    selected={isSelected(line)}
                    onToggle={() => toggle([line.listingId], !isSelected(line))}
                  />
                ))}
              </ul>
            </section>
          );
        })
      )}

      {lines.length > 0 && (
        // Above the phone tab bar (bottom-[4.5rem]) and at the bottom from md.
        <div className="fixed inset-x-0 bottom-[4.5rem] z-10 border-t border-border bg-background md:bottom-0">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-8">
            <div>
              <p className="text-[13px] text-muted-foreground">
                {t("selectedTotal", { count: selected.length })}
              </p>
              <Price amount={total} size="lg" />
            </div>
            <Button
              size="lg"
              disabled={selected.length === 0}
              className={cn(selected.length === 0 && "opacity-60")}
              onClick={() =>
                router.push(
                  checkoutHref(
                    selected.map((line) => ({
                      listingId: line.listingId,
                      quantity: String(line.quantity),
                    })),
                    true,
                  ),
                )
              }
            >
              {t("checkout", { count: selected.length })}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
