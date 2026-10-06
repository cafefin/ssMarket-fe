import type { ListingItem, ListingMode } from "@/lib/api/use-listings";
import { formatMoney } from "@/lib/format/money";

const quantityFormatter = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 3,
});

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
            <td className="py-3 text-right font-heading text-xl font-bold whitespace-nowrap">
              {formatMoney(item.unitPrice)}/{item.unit}
            </td>
            {showStock && (
              <td className="py-3 pl-3 text-right whitespace-nowrap">
                {item.stockQuantity === 0 ? (
                  <span className="text-error-deep">Hết hàng</span>
                ) : (
                  `${quantityFormatter.format(item.stockQuantity ?? 0)} ${item.unit}`
                )}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
