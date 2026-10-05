"use client";

import { ClockIcon, PackageIcon } from "lucide-react";
import type { ListingMode } from "@/lib/listings/listing-schema";

const CHOICES = [
  {
    mode: "in_stock",
    icon: PackageIcon,
    title: "Hàng có sẵn",
    description: "Đồ bạn đang có, bán đến khi hết.",
    example: "Ví dụ: loa cũ, sách, đồ gia dụng.",
  },
  {
    mode: "preorder",
    icon: ClockIcon,
    title: "Đặt trước",
    description: "Nhận đăng ký đến hạn chốt, giao theo đợt.",
    example: "Ví dụ: hoa quả theo tuần, đồ ăn theo ngày.",
  },
] as const;

/** The first step of "Đăng bán": what kind of sale is this? */
export function ModeStep({ onChoose }: { onChoose: (mode: ListingMode) => void }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[28px] leading-tight font-semibold">Đăng bán</h1>
        <p className="mt-1 text-muted-foreground">Bạn muốn bán theo cách nào?</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {CHOICES.map((choice) => (
          <button
            key={choice.mode}
            type="button"
            onClick={() => onChoose(choice.mode)}
            className="flex flex-col items-start gap-2 rounded-lg border border-border bg-card p-6 text-left outline-none hover:border-primary hover:bg-primary-soft focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <choice.icon aria-hidden="true" className="size-6 text-primary" />
            <span className="text-lg font-semibold">{choice.title}</span>
            <span>{choice.description}</span>
            <span className="text-sm text-muted-foreground">{choice.example}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
