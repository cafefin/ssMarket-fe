"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Price } from "@/shared/ui/atoms/price";
import { Button } from "@/shared/ui/atoms/shadcn/button";
import { Input } from "@/shared/ui/atoms/shadcn/input";
import { Label } from "@/shared/ui/atoms/shadcn/label";
import { ApiError } from "@/shared/api/api-error";
import { useUserMessage } from "@/shared/api/use-user-message";
import { useCurrentUser } from "@/shared/api/use-current-user";
import { type ListingDetail, LISTINGS_QUERY_KEY, listingQueryKey } from "@/features/listings";
import { type PaymentMethod, usePlaceOrder } from "../api/use-orders";
import { useFormat } from "@/shared/lib/format/use-format";
import {
  lineTotal,
  MAX_ORDER_QUANTITY,
  normalizeQuantity,
  quantityProblem,
} from "../lib/order-math";

const METHODS: readonly PaymentMethod[] = ["prepaid_qr", "pay_on_delivery"];

interface Shortage {
  itemId: string;
  name: string;
  available: number;
}

/** Quantities, payment method and delivery location for one order. */
export function OrderPanel({ listing }: { listing: ListingDetail }) {
  const router = useRouter();
  const { data: me } = useCurrentUser();
  const queryClient = useQueryClient();
  const placeOrder = usePlaceOrder();
  const t = useTranslations("orders.panel");
  const tq = useTranslations("orders.quantityProblem");
  const tc = useTranslations("common");
  const format = useFormat();
  const userMessage = useUserMessage();
  // One key for the life of this form: a double click or a retried request
  // reaches the server with the same key and creates a single order.
  const idempotencyKey = useRef(crypto.randomUUID());

  const accepted = METHODS.filter((method) =>
    method === "prepaid_qr"
      ? listing.acceptsPrepaidQr
      : listing.acceptsPayOnDelivery,
  );
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [method, setMethod] = useState<PaymentMethod>(accepted[0]);
  const [location, setLocation] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [showProblems, setShowProblems] = useState(false);
  const [shortages, setShortages] = useState<Shortage[]>([]);
  const [existingOrderId, setExistingOrderId] = useState<string | null>(null);

  const deliveryLocation = location ?? me?.deliveryLocation ?? "";

  const lines = listing.items.map((item) => {
    const quantity = normalizeQuantity(quantities[item.id] ?? "");
    const soldOut = item.stockQuantity === 0;
    let problem: string | null = null;
    if (quantity !== "") {
      const code = quantityProblem(quantity, item.unit);
      problem =
        code === "tooMany"
          ? tq(code, { max: MAX_ORDER_QUANTITY })
          : code && tq(code);
      if (
        !problem &&
        item.stockQuantity !== null &&
        Number(quantity) > item.stockQuantity
      ) {
        problem = t("onlyLeft", {
          quantity: format.quantity(item.stockQuantity),
          unit: item.unit,
        });
      }
    }
    return {
      item,
      quantity,
      soldOut,
      problem,
      total: quantity !== "" && !problem ? lineTotal(item.unitPrice, quantity) : 0,
    };
  });
  const chosen = lines.filter((line) => line.quantity !== "");
  const total = lines.reduce((sum, line) => sum + line.total, 0);
  const hasProblems = chosen.some((line) => line.problem);
  const locationMissing = deliveryLocation.trim() === "";

  async function submit(): Promise<void> {
    setShowProblems(true);
    setShortages([]);
    if (chosen.length === 0 || hasProblems || locationMissing) {
      return;
    }
    try {
      const order = await placeOrder.mutateAsync({
        idempotencyKey: idempotencyKey.current,
        body: {
          listingId: listing.id,
          lines: chosen.map((line) => ({
            itemId: line.item.id,
            quantity: line.quantity,
          })),
          paymentMethod: method,
          deliveryLocation: deliveryLocation.trim(),
          note: note.trim() || null,
        },
      });
      router.push(`/orders/${order.id}`);
    } catch (error) {
      if (error instanceof ApiError && error.code === "OUT_OF_STOCK") {
        setShortages((error.details.items as Shortage[] | undefined) ?? []);
        // Someone else bought in the meantime: show the real stock again.
        void queryClient.invalidateQueries({
          queryKey: listingQueryKey(listing.id),
        });
        // Cards in lists show stock too.
        void queryClient.invalidateQueries({ queryKey: LISTINGS_QUERY_KEY });
      } else if (error instanceof ApiError && error.code === "ALREADY_ORDERED") {
        setExistingOrderId(String(error.details.orderId ?? ""));
      } else {
        toast.error(userMessage(error));
      }
    }
  }

  if (existingOrderId !== null) {
    return (
      <section className="rounded-lg border border-border bg-primary-soft p-4">
        <h2 className="font-semibold">{t("alreadyOrdered")}</h2>
        <p className="mt-1 text-sm">
          {t("oneOrderPerRound")}{" "}
          <Link
            href={existingOrderId ? `/orders/${existingOrderId}` : "/orders"}
            className="font-medium text-primary underline"
          >
            {t("viewYourOrder")}
          </Link>
        </p>
      </section>
    );
  }

  return (
    <form
      noValidate
      aria-label={t("title")}
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      className="flex flex-col gap-4 rounded-lg border border-border p-4"
    >
      <h2 className="text-lg font-semibold">{t("title")}</h2>

      <ul className="flex flex-col gap-3">
        {lines.map(({ item, soldOut, problem }) => {
          const inputId = `quantity-${item.id}`;
          return (
            <li key={item.id} className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor={inputId} className="min-w-0 flex-1 font-normal">
                  <span className="block truncate">{item.name}</span>
                  <span className="block text-[13px] text-muted-foreground">
                    {format.money(item.unitPrice)}/{item.unit}
                    {item.stockQuantity !== null &&
                      (soldOut
                        ? t("soldOut")
                        : t("left", {
                            quantity: format.quantity(item.stockQuantity),
                          }))}
                  </span>
                </Label>
                <div className="flex shrink-0 items-center gap-2">
                  <Input
                    id={inputId}
                    inputMode={item.unit === "kg" ? "decimal" : "numeric"}
                    placeholder="0"
                    disabled={soldOut}
                    value={quantities[item.id] ?? ""}
                    aria-invalid={showProblems && Boolean(problem)}
                    onChange={(event) =>
                      setQuantities((current) => ({
                        ...current,
                        [item.id]: event.target.value,
                      }))
                    }
                    className="w-20 text-right"
                  />
                  <span className="w-8 text-sm text-muted-foreground">
                    {item.unit}
                  </span>
                </div>
              </div>
              {showProblems && problem && (
                <p role="alert" className="text-right text-[13px] text-error-deep">
                  {t("lineProblem", { item: item.name, problem })}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {shortages.length > 0 && (
        <div
          role="alert"
          className="rounded-md border border-error/40 bg-error-soft px-4 py-3 text-sm text-error-deep"
        >
          <p className="font-medium">{t("notEnough")}</p>
          <ul className="mt-1 list-disc pl-5">
            {shortages.map((shortage) => (
              <li key={shortage.itemId}>
                {t("shortage", {
                  item: shortage.name,
                  quantity: format.quantity(shortage.available),
                })}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-baseline justify-between border-t border-hairline-soft pt-3">
        <span className="text-sm text-muted-foreground">{t("total")}</span>
        {/* Repeats the heading-font classes so the line box matches the inner Price. */}
        <output
          aria-label={t("total")}
          className="font-heading text-4xl leading-tight font-bold"
        >
          <Price amount={total} size={36} />
        </output>
      </div>

      {accepted.length > 1 ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">{t("payment")}</legend>
          {accepted.map((option) => (
            <label key={option} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="paymentMethod"
                className="size-4 accent-primary"
                checked={method === option}
                onChange={() => setMethod(option)}
              />
              {tc(`paymentMethods.${option}`)}
            </label>
          ))}
        </fieldset>
      ) : (
        <p className="text-sm">
          <span className="font-medium">{t("paymentLabel")}</span>{" "}
          {tc(`paymentMethods.${accepted[0]}`)}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="deliveryLocation">{t("deliverTo")}</Label>
        <Input
          id="deliveryLocation"
          placeholder={t("deliverToPlaceholder")}
          maxLength={120}
          value={deliveryLocation}
          aria-invalid={showProblems && locationMissing}
          onChange={(event) => setLocation(event.target.value)}
        />
        {showProblems && locationMissing && (
          <p role="alert" className="text-[13px] text-error-deep">
            {t("locationRequired")}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="orderNote">{t("note")}</Label>
        <Input
          id="orderNote"
          maxLength={500}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </div>

      {showProblems && chosen.length === 0 && (
        <p role="alert" className="text-[13px] text-error-deep">
          {t("noItems")}
        </p>
      )}

      <Button type="submit" disabled={placeOrder.isPending}>
        {placeOrder.isPending ? t("placing") : t("place")}
      </Button>
    </form>
  );
}
