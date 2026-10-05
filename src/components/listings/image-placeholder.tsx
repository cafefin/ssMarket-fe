import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Shown where a listing has no photo. */
export function ImagePlaceholder({ className }: { className?: string }) {
  return (
    <div
      data-testid="image-placeholder"
      className={cn(
        "flex items-center justify-center bg-surface text-stone",
        className,
      )}
    >
      <ImageIcon aria-hidden="true" className="size-8" />
    </div>
  );
}
