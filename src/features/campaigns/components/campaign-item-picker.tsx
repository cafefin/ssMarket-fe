"use client";

import { useTranslations } from "next-intl";
import {
  ImagePlaceholder,
  MAX_ORDER_QUANTITY,
  nextCombo,
  normalizeQuantity,
} from "@/features/listings";
import { useFormat } from "@/shared/lib/format/use-format";
import { Price } from "@/shared/ui/atoms/price";
import { QuantityStepper } from "@/shared/ui/molecules/quantity-stepper";
import {
  type PickerItem,
  type Selection,
  selectionProblem,
} from "../lib/selection";

function Row({
  item,
  quantity,
  problem,
  onChange,
  disabled,
  readOnly,
}: {
  item: PickerItem;
  /** As typed; "" when nothing is chosen. */
  quantity: string;
  problem: ReturnType<typeof selectionProblem>;
  onChange: (quantity: string) => void;
  disabled: boolean;
  readOnly: boolean;
}) {
  const t = useTranslations("campaigns.picker");
  const tl = useTranslations("listings.detail");
  const tp = useTranslations("orders.panel");
  const tq = useTranslations("orders.quantityProblem");
  const format = useFormat();
  const hint =
    readOnly || problem ? null : nextCombo(item.combos, normalizeQuantity(quantity));

  return (
    <li className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1.5 border-t border-hairline-soft py-3 first:border-t-0">
      {item.thumbnailUrl ? (
        // Session-protected media, so next/image's optimizer cannot fetch it.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.thumbnailUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="size-12 rounded-md border border-border bg-surface object-cover"
        />
      ) : (
        <ImagePlaceholder className="size-12 rounded-md [&_svg]:size-5" />
      )}

      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="leading-snug font-medium break-words">{item.title}</p>
        <p className="flex flex-wrap items-baseline gap-x-2 text-[13px] text-muted-foreground">
          <span>
            <Price amount={item.unitPrice} size="sm" className="text-foreground" />
            <span>/{format.unit(item.unit)}</span>
          </span>
          {!item.selling && (
            <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-foreground">
              {t("stopped")}
            </span>
          )}
        </p>
        {item.combos.length > 0 && (
          <p className="flex flex-wrap gap-x-3 text-[13px] text-primary-deep">
            {item.combos.map((combo) => (
              <span key={combo.quantity}>
                {tl("combo", {
                  quantity: format.quantity(Number(combo.quantity)),
                  unit: format.unit(item.unit, Number(combo.quantity)),
                  price: format.money(combo.price),
                })}
              </span>
            ))}
          </p>
        )}
      </div>

      {!readOnly && (
        <QuantityStepper
          value={quantity}
          unit={item.unit}
          min={0}
          max={item.max}
          onChange={onChange}
          disabled={disabled}
          invalid={problem !== null}
          label={t("quantityOf", { title: item.title })}
        />
      )}

      {(item.description || hint || problem) && (
        <div className="col-span-full flex flex-col gap-1 min-[480px]:col-start-2">
          {item.description && (
            <p className="line-clamp-2 text-[13px] text-muted-foreground">
              {item.description}
            </p>
          )}
          {hint && (
            <p className="text-[13px] text-primary-deep">
              {tp("comboHint", {
                missing: format.quantity(hint.missing),
                quantity: format.quantity(Number(hint.combo.quantity)),
                unit: format.unit(item.unit, hint.missing),
                price: format.money(hint.combo.price),
              })}
            </p>
          )}
          {problem && (
            <p role="alert" className="text-[13px] text-error-deep">
              {problem === "aboveMax"
                ? t("aboveMax", {
                    max: format.quantity(item.max ?? 0),
                    unit: format.unit(item.unit, item.max ?? 0),
                  })
                : problem === "tooMany"
                  ? tq(problem, { max: MAX_ORDER_QUANTITY })
                  : tq(problem)}
            </p>
          )}
        </div>
      )}
    </li>
  );
}

/**
 * The products of a round, one row each (photo, title, price, deals,
 * description) with a quantity that starts at nothing. The parent holds the
 * selection and reads lines and totals from it with `lib/selection`.
 */
export function CampaignItemPicker({
  items,
  selection,
  onChange,
  disabled = false,
  readOnly = false,
}: {
  items: PickerItem[];
  selection: Selection;
  onChange: (selection: Selection) => void;
  disabled?: boolean;
  /** Lists the products without quantities: nothing can be chosen. */
  readOnly?: boolean;
}) {
  const t = useTranslations("campaigns.picker");
  if (items.length === 0) {
    return <p className="py-6 text-center text-muted-foreground">{t("empty")}</p>;
  }
  return (
    <ul>
      {items.map((item) => (
        <Row
          key={item.id}
          item={item}
          quantity={selection[item.id] ?? ""}
          problem={readOnly ? null : selectionProblem(item, selection)}
          onChange={(quantity) => onChange({ ...selection, [item.id]: quantity })}
          disabled={disabled}
          readOnly={readOnly}
        />
      ))}
    </ul>
  );
}
