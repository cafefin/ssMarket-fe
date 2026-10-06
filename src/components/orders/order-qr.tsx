"use client";

import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import type { OrderQr as Qr } from "@/lib/api/use-orders";
import { formatMoney } from "@/shared/lib/format/money";

function CopyRow({
  label,
  display,
  value,
  mono,
}: {
  label: string;
  display: string;
  /** What goes to the clipboard, when it differs from what is shown. */
  value: string;
  mono?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy(): Promise<void> {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center justify-between gap-3 border-t border-hairline-soft py-2">
      <div className="min-w-0">
        <dt className="text-[13px] text-muted-foreground">{label}</dt>
        <dd className={mono ? "font-mono font-medium break-all" : "font-medium"}>
          {display}
        </dd>
      </div>
      <button
        type="button"
        onClick={() => void copy()}
        aria-label={`Sao chép ${label.toLowerCase()}`}
        className="shrink-0 rounded-full border border-border px-3 py-1.5 text-[13px] font-medium outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span aria-live="polite">{copied ? "Đã sao chép" : "Sao chép"}</span>
      </button>
    </div>
  );
}

/** The VietQR code for one order, with the same details as text to copy. */
export function OrderQr({ qr, code }: { qr: Qr; code: string }) {
  return (
    <section
      aria-label="Thông tin chuyển khoản"
      className="rounded-lg border border-border p-4"
    >
      <div className="flex flex-col items-center gap-2">
        <QRCodeSVG
          value={qr.payload}
          size={220}
          marginSize={2}
          role="img"
          aria-label={`Mã QR chuyển khoản cho đơn ${code}`}
        />
        <p className="text-center text-sm text-muted-foreground">
          Quét bằng app ngân hàng. Số tiền và nội dung đã được điền sẵn.
        </p>
      </div>
      <dl className="mt-3">
        <div className="border-t border-hairline-soft py-2">
          <dt className="text-[13px] text-muted-foreground">Ngân hàng</dt>
          <dd className="font-medium">{qr.bankName}</dd>
        </div>
        <CopyRow
          label="Số tài khoản"
          display={qr.accountNumber}
          value={qr.accountNumber}
          mono
        />
        <div className="border-t border-hairline-soft py-2">
          <dt className="text-[13px] text-muted-foreground">Chủ tài khoản</dt>
          <dd className="font-medium">{qr.accountName}</dd>
        </div>
        <CopyRow
          label="Số tiền"
          display={formatMoney(qr.amount)}
          value={String(qr.amount)}
        />
        <CopyRow
          label="Nội dung"
          display={qr.content}
          value={qr.content}
          mono
        />
      </dl>
    </section>
  );
}
