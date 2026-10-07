"use client";

import { QRCodeSVG } from "qrcode.react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { OrderQr as Qr } from "../api/use-orders";
import { useFormat } from "@/shared/lib/format/use-format";

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
  const t = useTranslations("orders.qr");
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
        aria-label={t("copyNamed", { label: label.toLowerCase() })}
        className="shrink-0 rounded-full border border-border px-3 py-1.5 text-[13px] font-medium outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span aria-live="polite">{copied ? t("copied") : t("copy")}</span>
      </button>
    </div>
  );
}

/** The VietQR code for one order, with the same details as text to copy. */
export function OrderQr({ qr, code }: { qr: Qr; code: string }) {
  const t = useTranslations("orders.qr");
  const format = useFormat();
  return (
    <section
      aria-label={t("section")}
      className="rounded-lg border border-border p-4"
    >
      <div className="flex flex-col items-center gap-2">
        <QRCodeSVG
          value={qr.payload}
          size={220}
          marginSize={2}
          role="img"
          aria-label={t("code", { code })}
        />
        <p className="text-center text-sm text-muted-foreground">
          {t("hint")}
        </p>
      </div>
      <dl className="mt-3">
        <div className="border-t border-hairline-soft py-2">
          <dt className="text-[13px] text-muted-foreground">{t("bank")}</dt>
          <dd className="font-medium">{qr.bankName}</dd>
        </div>
        <CopyRow
          label={t("accountNumber")}
          display={qr.accountNumber}
          value={qr.accountNumber}
          mono
        />
        <div className="border-t border-hairline-soft py-2">
          <dt className="text-[13px] text-muted-foreground">
            {t("accountName")}
          </dt>
          <dd className="font-medium">{qr.accountName}</dd>
        </div>
        <CopyRow
          label={t("amount")}
          display={format.money(qr.amount)}
          value={String(qr.amount)}
        />
        <CopyRow
          label={t("content")}
          display={qr.content}
          value={qr.content}
          mono
        />
      </dl>
    </section>
  );
}
