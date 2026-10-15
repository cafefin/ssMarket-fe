"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import {
  type CampaignItem,
  CampaignItemPicker,
  type PickerItem,
  type Selection,
  selectedLines,
  selectionProblems,
  selectionTotal,
  toPickerItem,
  useCampaign,
} from "@/features/campaigns";
import { Button } from "@/shared/ui/atoms/shadcn/button";
import { Input } from "@/shared/ui/atoms/shadcn/input";
import { Label } from "@/shared/ui/atoms/shadcn/label";
import { Skeleton } from "@/shared/ui/atoms/shadcn/skeleton";
import { useUserMessage } from "@/shared/api/use-user-message";
import { type Order, useEditOrder } from "../api/use-orders";
import { useFormat } from "@/shared/lib/format/use-format";

type Line = Order["lines"][number];

/**
 * The rows of the editor: the round's products on sale, in the round's
 * order, then the order's lines the round no longer shows. Anyone but the
 * seller is sent only the products on sale, so a product the seller stopped
 * selling is known from the order line alone; leaving it out would delete it,
 * because the server takes the lines sent as the whole order.
 *
 * A product in the order keeps the price it was ordered at; one that is no
 * longer on sale can only go down from the quantity ordered.
 */
function pickerItems(products: CampaignItem[], lines: Line[]): PickerItem[] {
  const ordered = new Map(lines.map((line) => [line.listingId, line]));
  const shown = new Set(products.map((product) => product.id));
  const fromRound = products
    .filter((product) => product.selling || ordered.has(product.id))
    .map((product) => {
      const item = toPickerItem(product);
      const line = ordered.get(product.id);
      return line
        ? {
            ...item,
            unitPrice: line.unitPrice,
            combos: line.combos,
            max: product.selling ? null : line.quantity,
          }
        : item;
    });
  const stopped = lines
    .filter((line) => !shown.has(line.listingId))
    .map((line) => ({
      id: line.listingId,
      title: line.title,
      description: "",
      unit: line.unit,
      unitPrice: line.unitPrice,
      combos: line.combos,
      thumbnailUrl: null,
      selling: false,
      max: line.quantity,
    }));
  return [...fromRound, ...stopped];
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
    // The editor lists the products of the round; without one there are none.
    !order.campaign ||
    order.fulfillmentStatus !== "pending"
  ) {
    return "hidden";
  }
  if (order.paymentStatus !== "unpaid") {
    return "reported";
  }
  if (new Date(order.campaign.orderDeadline).getTime() <= now.getTime()) {
    return "pastDeadline";
  }
  return null;
}

/**
 * Lets a buyer change the products of a pre-order, their quantities, the
 * delivery place and the note. Each ordered product keeps the price it was
 * ordered at; the server applies the same rule. A product set to 0 leaves
 * the order; one must remain.
 */
export function OrderEditor({
  order,
  campaignId,
  onDone,
}: {
  order: Order;
  campaignId: string;
  onDone: () => void;
}) {
  const campaign = useCampaign(campaignId);
  const t = useTranslations("orders.editor");
  const tc = useTranslations("common");

  if (campaign.isPending) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true" aria-label={t("loading")}>
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (!campaign.data) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3">
        <p>{t("loadFailed")}</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void campaign.refetch()}>
            {tc("retry")}
          </Button>
          <Button variant="ghost" onClick={onDone}>
            {t("dismiss")}
          </Button>
        </div>
      </div>
    );
  }
  return (
    <EditForm order={order} products={campaign.data.items} onDone={onDone} />
  );
}

function EditForm({
  order,
  products,
  onDone,
}: {
  order: Order;
  products: CampaignItem[];
  onDone: () => void;
}) {
  const editOrder = useEditOrder();
  const t = useTranslations("orders.editor");
  const tp = useTranslations("orders.panel");
  const tc = useTranslations("common");
  const format = useFormat();
  const userMessage = useUserMessage();
  const items = pickerItems(products, order.lines);
  const [selection, setSelection] = useState<Selection>(() =>
    Object.fromEntries(
      order.lines.map((line) => [
        line.listingId,
        String(line.quantity).replace(".", ","),
      ]),
    ),
  );
  const [location, setLocation] = useState(order.deliveryLocation);
  const [note, setNote] = useState(order.note ?? "");
  const [showProblems, setShowProblems] = useState(false);

  const anyProblem = selectionProblems(items, selection).length > 0;
  const lines = selectedLines(items, selection);
  const noItems = !anyProblem && lines.length === 0;
  const total = anyProblem ? 0 : selectionTotal(items, selection);
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
          lines,
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
      <CampaignItemPicker
        items={items}
        selection={selection}
        onChange={setSelection}
        disabled={editOrder.isPending}
      />
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
