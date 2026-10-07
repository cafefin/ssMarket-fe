import type { ListingItem, ListingMode } from "../api/use-listings";
import { Price } from "@/shared/ui/atoms/price";
import { formatQuantity } from "@/shared/lib/format/quantity";

/** The items of a listing. Stock is shown only for in-stock listings. */
export function ItemTable({
  items,
  mode,
}: {
  items: ListingItem[];
  mode: ListingMode;
}) {
  const showStock = mode === "in_stock";
  const header =
    "pb-2 text-left text-[11px] font-semibold tracking-wide text-muted-foreground uppercase";

  return (
    <table className="w-full text-sm">
      <thead>
        <tr>
          <th scope="col" className={header}>
            Mặt hàng
          </th>
          <th scope="col" className={`${header} text-right`}>
            Đơn giá
          </th>
          {showStock && (
            <th scope="col" className={`${header} text-right`}>
              Còn lại
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
                  <span className="text-error-deep">Hết hàng</span>
                ) : (
                  `${formatQuantity(item.stockQuantity ?? 0)} ${item.unit}`
                )}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
