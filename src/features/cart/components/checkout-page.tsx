"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { type Order, OrderQr, type PaymentMethod } from "@/features/orders";
import { ApiError } from "@/shared/api/api-error";
import { useCurrentUser } from "@/shared/api/use-current-user";
import { useUserMessage } from "@/shared/api/use-user-message";
import { formatDate } from "@/shared/lib/format/datetime";
import { useFormat } from "@/shared/lib/format/use-format";
import { Price } from "@/shared/ui/atoms/price";
import { Button, buttonVariants } from "@/shared/ui/atoms/shadcn/button";
import { Input } from "@/shared/ui/atoms/shadcn/input";
import { Label } from "@/shared/ui/atoms/shadcn/label";
import { Skeleton } from "@/shared/ui/atoms/shadcn/skeleton";
import { UserAvatar } from "@/shared/ui/molecules/user-avatar";
import {
  type PlannedOrder,
  useCheckout,
  useCheckoutPreview,
} from "../api/use-cart";
import { parseCheckoutLink } from "../lib/checkout-link";

interface Choice {
  paymentMethod: PaymentMethod | null;
  deliveryLocation: string | null;
  note: string;
}

function Done({ orders }: { orders: Order[] }) {
  const t = useTranslations("checkout");
  const format = useFormat();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[28px] leading-tight font-semibold">
          {t("done", { count: orders.length })}
        </h1>
        <p className="mt-1 text-muted-foreground">{t("doneHint")}</p>
      </div>
      {orders.map((order) => (
        <section
          key={order.id}
          aria-label={order.code}
          className="flex flex-col gap-3 rounded-lg border border-border p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium">{order.seller.name}</span>
            <Price amount={order.totalAmount} />
          </div>
          {order.qr ? (
            <OrderQr qr={order.qr} code={order.code} />
          ) : (
            <p className="text-sm">
              {t("payOnDelivery", { amount: format.money(order.totalAmount) })}
            </p>
          )}
          <Link
            href={`/orders/${order.id}`}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {t("viewOrder", { code: order.code })}
          </Link>
        </section>
      ))}
      <Link href="/orders" className={buttonVariants({ variant: "outline" })}>
        {t("myOrders")}
      </Link>
    </div>
  );
}

/**
 * Checks out the lines in the link: one block per order the server will
 * create (one per seller, one per pre-order round), then all of them at once.
 */
export function CheckoutPage() {
  const t = useTranslations("checkout");
  const tc = useTranslations("common");
  const format = useFormat();
  const userMessage = useUserMessage();
  const params = useSearchParams();
  const { lines, fromCart } = useMemo(() => parseCheckoutLink(params), [params]);
  const { data: me } = useCurrentUser();
  const preview = useCheckoutPreview(lines);
  const checkout = useCheckout();
  // One key for the life of this page, like the order panel.
  const idempotencyKey = useRef(crypto.randomUUID());
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [showProblems, setShowProblems] = useState(false);
  const [shortages, setShortages] = useState<
    { listingId: string; title?: string; available: number }[]
  >([]);
  const [placed, setPlaced] = useState<Order[] | null>(null);
  // A pre-order the buyer already has an order for: link to that order.
  const [existingOrderId, setExistingOrderId] = useState<string | null>(null);

  if (placed) {
    return <Done orders={placed} />;
  }
  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <p className="text-muted-foreground">{t("nothing")}</p>
        <Link href="/cart" className={buttonVariants({ variant: "outline" })}>
          {t("backToCart")}
        </Link>
      </div>
    );
  }
  if (preview.isPending) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true" aria-label={t("loading")}>
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
    );
  }
  if (preview.isError || !preview.data) {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 py-12 text-center">
        <p className="text-error-deep">{userMessage(preview.error)}</p>
        <Link href="/cart" className={buttonVariants({ variant: "outline" })}>
          {t("backToCart")}
        </Link>
      </div>
    );
  }

  const orders = preview.data.orders;
  const choiceOf = (order: PlannedOrder) => {
    const choice = choices[order.key];
    return {
      paymentMethod:
        choice?.paymentMethod && order.paymentMethods.includes(choice.paymentMethod)
          ? choice.paymentMethod
          : order.paymentMethods[0],
      deliveryLocation: choice?.deliveryLocation ?? me?.deliveryLocation ?? "",
      note: choice?.note ?? "",
    };
  };
  const update = (key: string, change: Partial<Choice>) =>
    setChoices((current) => ({
      ...current,
      [key]: {
        paymentMethod: current[key]?.paymentMethod ?? null,
        deliveryLocation: current[key]?.deliveryLocation ?? null,
        note: current[key]?.note ?? "",
        ...change,
      },
    }));
  const total = orders.reduce((sum, order) => sum + order.totalAmount, 0);
  const missingLocation = orders.some(
    (order) => choiceOf(order).deliveryLocation.trim() === "",
  );

  async function place(): Promise<void> {
    setShowProblems(true);
    setShortages([]);
    setExistingOrderId(null);
    if (missingLocation) {
      return;
    }
    try {
      const result = await checkout.mutateAsync({
        idempotencyKey: idempotencyKey.current,
        body: {
          lines,
          fromCart,
          orders: orders.map((order) => {
            const choice = choiceOf(order);
            return {
              key: order.key,
              paymentMethod: choice.paymentMethod,
              deliveryLocation: choice.deliveryLocation.trim(),
              note: choice.note.trim() || null,
            };
          }),
        },
      });
      setPlaced(result.orders);
    } catch (error) {
      if (error instanceof ApiError && error.code === "OUT_OF_STOCK") {
        setShortages(
          (error.details.items as typeof shortages | undefined) ?? [],
        );
        void preview.refetch();
      } else if (error instanceof ApiError && error.code === "ALREADY_ORDERED") {
        setExistingOrderId((error.details.orderId as string | undefined) ?? null);
      } else if (error instanceof ApiError && error.code === "CHECKOUT_CHANGED") {
        toast.error(t("changed"));
        void preview.refetch();
      } else {
        toast.error(userMessage(error));
      }
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[28px] leading-tight font-semibold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("intro")}</p>
      </div>

      {orders.map((order) => {
        const choice = choiceOf(order);
        const locationId = `location-${order.key}`;
        const noteId = `note-${order.key}`;
        return (
          <section
            key={order.key}
            aria-label={t("orderOf", { name: order.seller.name })}
            className="flex flex-col gap-4 rounded-lg border border-border p-4"
          >
            <header className="flex flex-col gap-1">
              <p className="flex items-center gap-2 font-semibold">
                <UserAvatar
                  name={order.seller.name}
                  avatarUrl={order.seller.avatarUrl}
                  size="xs"
                />
                {t("orderOf", { name: order.seller.name })}
              </p>
              {order.isPreorder && order.orderDeadline && order.deliveryDate && (
                <p className="text-[13px] text-deadline-deep">
                  {t("preorder", {
                    deadline: format.deadline(order.orderDeadline),
                    delivery: formatDate(order.deliveryDate),
                  })}
                </p>
              )}
            </header>

            <ul className="flex flex-col gap-2 text-sm">
              {order.lines.map((line) => (
                <li key={line.listingId} className="flex justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate">{line.title}</span>
                    <span className="text-[13px] text-muted-foreground">
                      {format.quantity(line.quantity)} {line.unit} ×{" "}
                      {format.money(line.unitPrice)}
                    </span>
                  </span>
                  <span className="text-right whitespace-nowrap">
                    {format.money(line.lineTotal)}
                    {line.listTotal > line.lineTotal && (
                      <span className="block text-[13px] text-muted-foreground line-through">
                        {format.money(line.listTotal)}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>

            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-medium">{t("payment")}</legend>
              {order.paymentMethods.map((method) => (
                <label key={method} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name={`payment-${order.key}`}
                    className="size-4 accent-primary"
                    checked={choice.paymentMethod === method}
                    onChange={() => update(order.key, { paymentMethod: method })}
                  />
                  {tc(`paymentMethods.${method}`)}
                </label>
              ))}
            </fieldset>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor={locationId}>{t("deliverTo")}</Label>
                <Input
                  id={locationId}
                  maxLength={120}
                  value={choice.deliveryLocation}
                  aria-invalid={
                    showProblems && choice.deliveryLocation.trim() === ""
                  }
                  onChange={(event) =>
                    update(order.key, { deliveryLocation: event.target.value })
                  }
                />
                {showProblems && choice.deliveryLocation.trim() === "" && (
                  <p role="alert" className="text-[13px] text-error-deep">
                    {t("locationRequired")}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor={noteId}>{t("note")}</Label>
                <Input
                  id={noteId}
                  maxLength={500}
                  value={choice.note}
                  onChange={(event) =>
                    update(order.key, { note: event.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex items-baseline justify-between border-t border-hairline-soft pt-3">
              <span className="text-sm text-muted-foreground">{t("subtotal")}</span>
              <Price amount={order.totalAmount} />
            </div>
          </section>
        );
      })}

      {existingOrderId && (
        <div
          role="alert"
          className="rounded-md border border-warn/40 bg-warn-soft px-4 py-3 text-sm text-warn-deep"
        >
          <p>{t("alreadyOrdered")}</p>
          <Link
            href={`/orders/${existingOrderId}`}
            className="mt-1 inline-block font-medium underline"
          >
            {t("viewExisting")}
          </Link>
        </div>
      )}

      {shortages.length > 0 && (
        <div
          role="alert"
          className="rounded-md border border-error/40 bg-error-soft px-4 py-3 text-sm text-error-deep"
        >
          <p className="font-medium">{t("short")}</p>
          <ul className="mt-1 list-disc pl-5">
            {shortages.map((shortage) => (
              <li key={shortage.listingId}>
                {t("shortLine", {
                  item: shortage.title ?? "",
                  available: format.quantity(shortage.available),
                })}
              </li>
            ))}
          </ul>
          <Link href="/cart" className="mt-2 inline-block font-medium underline">
            {t("backToCart")}
          </Link>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface p-4">
        <div>
          <p className="text-[13px] text-muted-foreground">
            {t("total", { count: orders.length })}
          </p>
          <output aria-label={t("total", { count: orders.length })}>
            <Price amount={total} size="lg" />
          </output>
        </div>
        <Button
          size="lg"
          disabled={checkout.isPending}
          onClick={() => void place()}
        >
          {checkout.isPending ? t("placing") : t("place", { count: orders.length })}
        </Button>
      </div>
    </div>
  );
}
