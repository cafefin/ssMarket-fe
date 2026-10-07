import { cn } from "@/shared/lib/utils";

/**
 * The ssMarket mark: a shopping bag with a smile. It is our own drawing and
 * uses the theme colours; it is not the SmartOSC logo.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      aria-hidden="true"
      className={cn("size-10 shrink-0", className)}
    >
      <path
        d="M13 15v-4a7 7 0 0 1 14 0v4"
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        className="stroke-positive-deep"
      />
      <rect x="4" y="12" width="32" height="25" rx="9" className="fill-primary" />
      <circle cx="14.5" cy="22" r="2.1" className="fill-primary-foreground" />
      <circle cx="25.5" cy="22" r="2.1" className="fill-primary-foreground" />
      <path
        d="M13.5 27.5q6.5 6 13 0"
        fill="none"
        strokeWidth="2.6"
        strokeLinecap="round"
        className="stroke-primary-foreground"
      />
    </svg>
  );
}
