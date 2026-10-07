"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/atoms/shadcn/button";
import { Input } from "@/shared/ui/atoms/shadcn/input";
import { Label } from "@/shared/ui/atoms/shadcn/label";
import { Skeleton } from "@/shared/ui/atoms/shadcn/skeleton";
import { useUserMessage } from "@/shared/api/use-user-message";
import { useListing } from "@/features/listings";
import { type Order, useEditOrder } from "../api/use-orders";
import { useFormat } from "@/shared/lib/format/use-format";
import {
  lineTotalWithCombos,
  MAX_ORDER_QUANTITY,
  normalizeQuantity,
  quantityProblem,
} from "../lib/order-math";

/**
 * Why a buyer cannot edit this order, or null when they can. "hidden" means
 * the buyer sees no explanation either; the other reasons are message keys.
 */
export function editBlockedReason(
  order: Order,
  now: Date,
): "hidden" | "reported" | "pastDeadline" | null {
  if (
    order.viewerRole !== "buyer" ||
    !order.isPreorder ||
    order.fulfillmentStatus !== "pending"
  ) {
    return "hidden";
  }
  if (order.paymentStatus !== "unpaid") {
    return "reported";
  }
  if (
    order.listing.orderDeadline &&
    new Date(order.listing.orderDeadline).getTime() <= now.getTime()
  ) {
    return "pastDeadline";
  }
  return null;
}

/**
 * Lets a buyer change the quantities of a pre-order. Items already in the
 * order are shown at the price they were ordered at; items added now use the
 * listing's current price. The server applies the same rule.
 */
export function OrderEditor({
  order,
  onDone,
}: {
  order: Order;
  onDone: () => void;
}) {
  const { data: listing, isPending, isError } = useListing(order.listing.id);
  const editOrder = useEditOrder();
  const t = useTranslations("orders.editor");
  const tp = useTranslations("orders.panel");
  const tq = useTranslations("orders.quantityProblem");
  const tc = useTranslations("common");
  const format = useFormat();
  const userMessage = useUserMessage();
  const [quantities, setQuantities] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      order.lines.map((line) => [
        line.itemId,
        String(line.quantity).replace(".", ","),
      ]),
    ),
  );
  const [location, setLocation] = useState(order.deliveryLocation);
  const [note, setNote] = useState(order.note ?? "");
  const [showProblems, setShowProblems] = useState(false);

  if (isPending) {
    return <Skeleton className="h-40 w-full rounded-lg" aria-label={t("loading")} />;
  }
  if (isError || !listing) {
    return (
      <p role="alert" className="text-sm text-error-deep">
        {t("loadFailed")}
      </p>
    );
  }

  // Ordered items first at their ordered price, then the rest of the listing.
  const ordered = order.lines.map((line) => ({
    id: line.itemId,
    name: line.itemName,
    unit: line.unit,
    unitPrice: line.unitPrice,
    // The combos the line was priced with stay with it, like the price.
    combos: line.combos,
  }));
  const orderedIds = new Set(ordered.map((item) => item.id));
  const items = [
    ...ordered,
    ...listing.items
      .filter((item) => !orderedIds.has(item.id))
      .map(({ id, name, unit, unitPrice, combos }) => ({
        id,
        name,
        unit,
        unitPrice,
        combos,
      })),
  ];

  const lines = items.map((item) => {
    const quantity = normalizeQuantity(quantities[item.id] ?? "");
    const code = quantity === "" ? null : quantityProblem(quantity, item.unit);
    const problem =
      code === "tooMany"
        ? tq(code, { max: MAX_ORDER_QUANTITY })
        : code && tq(code);
    return {
      item,
      quantity,
      problem,
      total:
        quantity !== "" && !problem
          ? lineTotalWithCombos(item.unitPrice, item.combos, quantity)
          : 0,
    };
  });
  const chosen = lines.filter((line) => line.quantity !== "");
  const total = lines.reduce((sum, line) => sum + line.total, 0);
  const locationMissing = location.trim() === "";

  async function save(): Promise<void> {
    setShowProblems(true);
    if (chosen.length === 0 || chosen.some((line) => line.problem) || locationMissing) {
      return;
    }
    try {
      await editOrder.mutateAsync({
        id: order.id,
        body: {
          lines: chosen.map((line) => ({
            itemId: line.item.id,
            quantity: line.quantity,
          })),
          paymentMethod: order.paymentMethod,
          deliveryLocation: location.trim(),
          note: note.trim() || null,
        },
      });
      toast.success(t("updated"));
      onDone();
    } catch (error) {
      toast.error(userMessage(error));
    }
  }

  return (
    <form
      noValidate
      aria-label={t("title")}
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
      className="flex flex-col gap-4 rounded-lg border border-primary bg-primary-soft/40 p-4"
    >
      <h2 className="text-lg font-semibold">{t("title")}</h2>
      <ul className="flex flex-col gap-3">
        {lines.map(({ item, problem }) => {
          const inputId = `edit-quantity-${item.id}`;
          return (
            <li key={item.id} className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor={inputId} className="min-w-0 flex-1 font-normal">
                  <span className="block truncate">{item.name}</span>
                  <span className="block text-[13px] text-muted-foreground">
                    {format.money(item.unitPrice)}/{item.unit}
                  </span>
                </Label>
                <div className="flex shrink-0 items-center gap-2">
                  <Input
                    id={inputId}
                    inputMode={item.unit === "kg" ? "decimal" : "numeric"}
                    placeholder="0"
                    value={quantities[item.id] ?? ""}
                    aria-invalid={showProblems && Boolean(problem)}
                    onChange={(event) =>
                      setQuantities((current) => ({
                        ...current,
                        [item.id]: event.target.value,
                      }))
                    }
                    className="w-20 bg-background text-right"
                  />
                  <span className="w-8 text-sm text-muted-foreground">
                    {item.unit}
                  </span>
                </div>
              </div>
              {showProblems && problem && (
                <p role="alert" className="text-right text-[13px] text-error-deep">
                  {tp("lineProblem", { item: item.name, problem })}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between border-t border-hairline-soft pt-3">
        <span className="text-sm text-muted-foreground">{t("newTotal")}</span>
        <output aria-label={t("newTotal")} className="text-lg font-semibold">
          {format.money(total)}
        </output>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="editDeliveryLocation">{tp("deliverTo")}</Label>
        <Input
          id="editDeliveryLocation"
          maxLength={120}
          value={location}
          aria-invalid={showProblems && locationMissing}
          onChange={(event) => setLocation(event.target.value)}
          className="bg-background"
        />
        {showProblems && locationMissing && (
          <p role="alert" className="text-[13px] text-error-deep">
            {tp("locationRequired")}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="editNote">{tp("note")}</Label>
        <Input
          id="editNote"
          maxLength={500}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className="bg-background"
        />
      </div>

      {showProblems && chosen.length === 0 && (
        <p role="alert" className="text-[13px] text-error-deep">
          {t("noItems")}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={editOrder.isPending}>
          {editOrder.isPending ? tc("saving") : t("saveChanges")}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          {t("dismiss")}
        </Button>
      </div>
    </form>
  );
}
