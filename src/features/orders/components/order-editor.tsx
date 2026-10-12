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
  type QuantityProblem,
  quantityProblem,
} from "../lib/order-math";

type Line = Order["lines"][number];

/** What was typed for one line: left out of the order, wrong, or a quantity. */
function readLine(
  line: Line,
  text: string,
): { quantity: string | null; problem: QuantityProblem | null } {
  const quantity = normalizeQuantity(text);
  // Nothing or zero means the buyer no longer wants this product.
  if (quantity === "" || Number(quantity) === 0) {
    return { quantity: null, problem: null };
  }
  const problem = quantityProblem(quantity, line.unit);
  return { quantity: problem ? null : quantity, problem };
}

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
  const deadline = order.campaign?.orderDeadline;
  if (deadline && new Date(deadline).getTime() <= now.getTime()) {
    return "pastDeadline";
  }
  return null;
}

/**
 * Lets a buyer change the quantities of a pre-order, its delivery place and
 * note. Each product keeps the price it was ordered at; the server applies
 * the same rule. A product set to 0 leaves the order; one must remain.
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
  const [texts, setTexts] = useState(() =>
    order.lines.map((line) => String(line.quantity).replace(".", ",")),
  );
  const [location, setLocation] = useState(order.deliveryLocation);
  const [note, setNote] = useState(order.note ?? "");
  const [showProblems, setShowProblems] = useState(false);

  const read = order.lines.map((line, index) => readLine(line, texts[index]));
  const lines = order.lines.flatMap((line, index) => {
    const quantity = read[index].quantity;
    return quantity === null ? [] : [{ line, quantity }];
  });
  const anyProblem = read.some((entry) => entry.problem !== null);
  const noItems = !anyProblem && lines.length === 0;
  const total =
    anyProblem || noItems
      ? 0
      : lines.reduce(
          (sum, { line, quantity }) =>
            sum + lineTotalWithCombos(line.unitPrice, line.combos, quantity),
          0,
        );
  const locationMissing = location.trim() === "";

  async function save(): Promise<void> {
    setShowProblems(true);
    if (anyProblem || noItems || locationMissing) {
      return;
    }
    try {
      await editOrder.mutateAsync({
        id: order.id,
        body: {
          lines: lines.map(({ line, quantity }) => ({
            listingId: line.listingId,
            quantity,
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
        {order.lines.map((line, index) => {
          const id = `editQuantity-${line.listingId}`;
          const code = read[index].problem;
          const problem =
            code === "tooMany" ? tq(code, { max: MAX_ORDER_QUANTITY }) : code && tq(code);
          return (
            <li key={line.listingId} className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor={id} className="min-w-0 flex-1 font-normal">
                  <span className="block truncate">{line.title}</span>
                  <span className="block text-[13px] text-muted-foreground">
                    {format.money(line.unitPrice)}/{format.unit(line.unit)}
                  </span>
                </Label>
                <div className="flex shrink-0 items-center gap-2">
                  <Input
                    id={id}
                    inputMode={line.unit === "kg" ? "decimal" : "numeric"}
                    placeholder="0"
                    value={texts[index]}
                    aria-invalid={showProblems && (Boolean(problem) || noItems)}
                    onChange={(event) =>
                      setTexts((current) =>
                        current.map((text, i) =>
                          i === index ? event.target.value : text,
                        ),
                      )
                    }
                    className="w-20 bg-background text-right"
                  />
                  <span className="min-w-8 text-sm text-muted-foreground">
                    {format.unit(line.unit)}
                  </span>
                </div>
              </div>
              {showProblems && problem && (
                <p role="alert" className="text-right text-[13px] text-error-deep">
                  {problem}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      {showProblems && noItems && (
        <p role="alert" className="text-right text-[13px] text-error-deep">
          {t("noItems")}
        </p>
      )}

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
