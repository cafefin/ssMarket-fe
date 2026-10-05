import { type ApiError, toApiError } from "@/lib/api/api-error";
import type { api as apiClient } from "@/lib/api/client";
import type { ListingInputBody } from "./listing-schema";

type Api = typeof apiClient;

export interface SubmitListingInput {
  api: Api;
  /** Set when editing; absent when creating. */
  listingId?: string;
  body: ListingInputBody;
  newImages: File[];
  removedImageIds: string[];
  publish: boolean;
}

export interface SubmitListingResult {
  id: string;
  /** Names of the photos that could not be uploaded. */
  failedImages: string[];
  /** Set when the listing was saved but could not be published. */
  publishError: ApiError | null;
  published: boolean;
}

/**
 * Saves a listing in the order the backend requires: the listing first (it
 * must exist before photos can be attached), then photo removals and
 * uploads, then publishing. A failed photo does not undo the save; the
 * listing simply stays unpublished so the seller can fix it. Rejects only
 * when the listing itself could not be saved.
 */
export async function submitListing({
  api,
  listingId,
  body,
  newImages,
  removedImageIds,
  publish,
}: SubmitListingInput): Promise<SubmitListingResult> {
  const saved = listingId
    ? await api.PATCH("/listings/{id}", {
        params: { path: { id: listingId } },
        body,
      })
    : await api.POST("/listings", { body });
  if (!saved.data) {
    throw toApiError(saved.error, saved.response);
  }
  const id = saved.data.id;

  for (const imageId of removedImageIds) {
    await api.DELETE("/listings/{listingId}/images/{imageId}", {
      params: { path: { listingId: id, imageId } },
    });
  }

  const failedImages: string[] = [];
  for (const file of newImages) {
    const upload = await api.POST("/listings/{listingId}/images", {
      params: { path: { listingId: id } },
      // The generated type describes the multipart field as a string; the
      // serializer below sends the real file.
      body: { file: file as unknown as string },
      bodySerializer: () => {
        const form = new FormData();
        form.append("file", file);
        return form;
      },
    });
    if (!upload.data) {
      failedImages.push(file.name);
    }
  }

  if (!publish || failedImages.length > 0) {
    return { id, failedImages, publishError: null, published: false };
  }

  const published = await api.POST("/listings/{id}/publish", {
    params: { path: { id } },
  });
  return {
    id,
    failedImages,
    publishError: published.data
      ? null
      : toApiError(published.error, published.response),
    published: Boolean(published.data),
  };
}
