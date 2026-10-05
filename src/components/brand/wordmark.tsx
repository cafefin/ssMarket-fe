import { cn } from "@/lib/utils";

/**
 * The ssMarket wordmark. It echoes the two-tone SmartOSC logo without using
 * the company's logo file. The green half uses the deep variant because the
 * brand green is too light for text on white.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="ssMarket"
      className={cn("font-bold tracking-tight", className)}
    >
      <span aria-hidden="true" className="text-primary">
        ss
      </span>
      <span aria-hidden="true" className="text-positive-deep">
        Market
      </span>
    </span>
  );
}
