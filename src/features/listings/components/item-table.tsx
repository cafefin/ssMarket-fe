import { useTranslations } from "next-intl";
import type { ListingItem, ListingMode } from "../api/use-listings";
import { Price } from "@/shared/ui/atoms/price";
import { useFormat } from "@/shared/lib/format/use-format";

/** The items of a listing. Stock is shown only for in-stock listings. */
export function ItemTable({
  items,
  mode,
}: {
  items: ListingItem[];
  mode: ListingMode;
}) {
  const t = useTranslations("listings");
  const format = useFormat();
  const showStock = mode === "in_stock";
  const header =
    "pb-2 text-left text-[11px] font-semibold tracking-wide text-muted-foreground uppercase";

  return (
    <table className="w-full text-sm">
      <thead>
        <tr>
          <th scope="col" className={header}>
            {t("items.item")}
          </th>
          <th scope="col" className={`${header} text-right`}>
            {t("items.unitPrice")}
          </th>
          {showStock && (
            <th scope="col" className={`${header} text-right`}>
              {t("items.remaining")}
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id} className="border-t border-hairline-soft">
            <th scope="row" className="py-3 pr-3 text-left font-normal">
              {item.name}
            </th>
            <td className="py-3 text-right whitespace-nowrap">
              <Price
                amount={item.unitPrice}
                size={20}
                unit={item.unit}
                unitStyle="inline"
              />
            </td>
            {showStock && (
              <td className="py-3 pl-3 text-right whitespace-nowrap">
                {item.stockQuantity === 0 ? (
                  <span className="text-error-deep">{t("outOfStock")}</span>
                ) : (
                  `${format.quantity(item.stockQuantity ?? 0)} ${item.unit}`
                )}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
