"use client";

import { useState } from "react";
import type { ListingDetail } from "@/lib/api/use-listings";
import { cn } from "@/shared/lib/utils";
import { ImagePlaceholder } from "./image-placeholder";

/** One large photo with thumbnails to switch between the others. */
export function ImageGallery({
  images,
  title,
}: {
  images: ListingDetail["images"];
  title: string;
}) {
  const [selected, setSelected] = useState(0);

  if (images.length === 0) {
    return <ImagePlaceholder className="aspect-[4/3] w-full rounded-lg" />;
  }
  const current = images[Math.min(selected, images.length - 1)];

  return (
    <div className="flex flex-col gap-3">
      {/* Session-protected media; see the note in listing-card.tsx. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={current.url}
        alt={`Ảnh ${selected + 1} của ${title}`}
        className="aspect-[4/3] w-full rounded-lg border border-border bg-surface object-contain"
      />
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              aria-label={`Xem ảnh ${index + 1}`}
              aria-pressed={index === selected}
              onClick={() => setSelected(index)}
              className={cn(
                "size-16 shrink-0 overflow-hidden rounded-md border-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                index === selected ? "border-primary" : "border-transparent",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.thumbnailUrl}
                alt=""
                className="size-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
