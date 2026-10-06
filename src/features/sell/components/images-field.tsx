"use client";

import { XIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ListingDetail } from "@/features/listings";
import { imageProblem, MAX_IMAGES } from "../lib/listing-schema";

interface ImagesFieldProps {
  /** Photos already saved on the listing and not marked for removal. */
  existing: ListingDetail["images"];
  /** Photos chosen in this session, uploaded when the form is saved. */
  added: File[];
  onAdd: (files: File[]) => void;
  onRemoveExisting: (id: string) => void;
  onRemoveAdded: (index: number) => void;
}

export function ImagesField({
  existing,
  added,
  onAdd,
  onRemoveExisting,
  onRemoveAdded,
}: ImagesFieldProps) {
  const [problem, setProblem] = useState<string | null>(null);
  const previews = useMemo(
    () => added.map((file) => URL.createObjectURL(file)),
    [added],
  );
  useEffect(
    () => () => previews.forEach((url) => URL.revokeObjectURL(url)),
    [previews],
  );

  const total = existing.length + added.length;

  function handleChoose(files: File[]): void {
    const accepted: File[] = [];
    let firstProblem: string | null = null;
    for (const file of files) {
      const fileProblem =
        total + accepted.length >= MAX_IMAGES
          ? `Mỗi bài đăng có tối đa ${MAX_IMAGES} ảnh.`
          : imageProblem(file);
      if (fileProblem) {
        firstProblem ??= `${file.name}: ${fileProblem}`;
      } else {
        accepted.push(file);
      }
    }
    setProblem(firstProblem);
    if (accepted.length > 0) {
      onAdd(accepted);
    }
  }

  const tile =
    "relative size-24 overflow-hidden rounded-md border border-border bg-surface";
  const removeButton =
    "absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-foreground/70 text-background outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-lg font-semibold">Ảnh</legend>
      <p className="-mt-1 text-sm text-muted-foreground">
        Tối đa {MAX_IMAGES} ảnh JPEG, PNG hoặc WebP, mỗi ảnh không quá 5 MB.
        Ảnh đầu tiên là ảnh đại diện.
      </p>

      {total > 0 && (
        <ul className="flex flex-wrap gap-3">
          {existing.map((image, index) => (
            <li key={image.id} className={tile}>
              {/* Session-protected media; see the note in listing-card.tsx. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.thumbnailUrl}
                alt={`Ảnh ${index + 1}`}
                className="size-full object-cover"
              />
              <button
                type="button"
                aria-label={`Xóa ảnh ${index + 1}`}
                onClick={() => onRemoveExisting(image.id)}
                className={removeButton}
              >
                <XIcon aria-hidden="true" className="size-4" />
              </button>
            </li>
          ))}
          {added.map((file, index) => {
            const number = existing.length + index + 1;
            return (
              <li key={`${file.name}-${index}`} className={tile}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previews[index]}
                  alt={`Ảnh ${number}: ${file.name}`}
                  className="size-full object-cover"
                />
                <button
                  type="button"
                  aria-label={`Xóa ảnh ${number}`}
                  onClick={() => onRemoveAdded(index)}
                  className={removeButton}
                >
                  <XIcon aria-hidden="true" className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div>
        <label
          htmlFor="listing-images"
          className="mb-2 block text-sm font-medium"
        >
          Thêm ảnh
        </label>
        <input
          id="listing-images"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          disabled={total >= MAX_IMAGES}
          onChange={(event) => {
            handleChoose(Array.from(event.target.files ?? []));
            // Allow choosing the same file again after removing it.
            event.target.value = "";
          }}
          className="block w-full text-sm file:mr-3 file:rounded-full file:border file:border-border file:bg-background file:px-4 file:py-2 file:text-sm file:font-medium"
        />
      </div>

      {problem && (
        <p role="alert" className="text-[13px] text-error-deep">
          {problem}
        </p>
      )}
    </fieldset>
  );
}
