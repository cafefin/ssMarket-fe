"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/atoms/shadcn/button";
import { Input } from "@/shared/ui/atoms/shadcn/input";
import { Label } from "@/shared/ui/atoms/shadcn/label";
import { useUserMessage } from "@/shared/api/use-user-message";
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
 * Lets a buyer change the quantity of a pre-order, its delivery place and
 * note. The product keeps the price it was ordered at; the server applies
 * the same rule.
 */
export function OrderEditor({
  order,
  onDone,
}: {
  order: Order;
  onDone: () => void;
}) {
  const editOrder = useEditOrder();
  const t = useTranslations("orders.editor");
  const tp = useTranslations("orders.panel");
  const tq = useTranslations("orders.quantityProblem");
  const tc = useTranslations("common");
  const format = useFormat();
  const userMessage = useUserMessage();
  const [line] = order.lines;
  const [quantityText, setQuantityText] = useState(
    String(line.quantity).replace(".", ","),
  );
  const [location, setLocation] = useState(order.deliveryLocation);
  const [note, setNote] = useState(order.note ?? "");
  const [showProblems, setShowProblems] = useState(false);

  const quantity = normalizeQuantity(quantityText);
  const code =
    quantity === "" ? "required" : quantityProblem(quantity, line.unit);
  const problem =
    code === "tooMany"
      ? tq(code, { max: MAX_ORDER_QUANTITY })
      : code === "required"
        ? t("noItems")
        : code && tq(code);
  const total = problem
    ? 0
    : lineTotalWithCombos(line.unitPrice, line.combos, quantity);
  const locationMissing = location.trim() === "";

  async function save(): Promise<void> {
    setShowProblems(true);
    if (problem || locationMissing) {
      return;
    }
    try {
      await editOrder.mutateAsync({
        id: order.id,
        body: {
          quantity,
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
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="editQuantity" className="min-w-0 flex-1 font-normal">
            <span className="block truncate">{line.title}</span>
            <span className="block text-[13px] text-muted-foreground">
              {format.money(line.unitPrice)}/{line.unit}
            </span>
          </Label>
          <div className="flex shrink-0 items-center gap-2">
            <Input
              id="editQuantity"
              inputMode={line.unit === "kg" ? "decimal" : "numeric"}
              placeholder="0"
              value={quantityText}
              aria-invalid={showProblems && Boolean(problem)}
              onChange={(event) => setQuantityText(event.target.value)}
              className="w-20 bg-background text-right"
            />
            <span className="w-8 text-sm text-muted-foreground">{line.unit}</span>
          </div>
        </div>
        {showProblems && problem && (
          <p role="alert" className="text-right text-[13px] text-error-deep">
            {problem}
          </p>
        )}
      </div>

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
