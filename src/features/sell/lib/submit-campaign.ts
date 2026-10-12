import { type ApiError, toApiError } from "@/shared/api/api-error";
import type { api as apiClient } from "@/shared/api/client";
import type { CampaignInputBody } from "./campaign-schema";

export type { CampaignInputBody } from "./campaign-schema";

type Api = typeof apiClient;

/** The photo changes of one product, made in the form and not saved yet. */
export interface ItemPhotos {
  newImages: File[];
  removedImageIds: string[];
}

export interface SubmitCampaignInput {
  api: Api;
  /** Set when editing; absent when creating. */
  campaignId?: string;
  body: CampaignInputBody;
  /** Same order as body.items. */
  photos: ItemPhotos[];
  publish: boolean;
}

export interface SubmitCampaignResult {
  id: string;
  /** Names of the photos that could not be uploaded. */
  failedImages: string[];
  /** Set when the round was saved but could not be published. */
  publishError: ApiError | null;
  published: boolean;
}

/**
 * Saves a round in the order the backend requires: the round with its
 * products first (the server answers with each product's id, in the order
 * sent), then each product's photo removals and uploads, then publishing. A
 * failed photo does not undo the save; the round simply stays unpublished so
 * the seller can fix it. Rejects only when the round itself could not be
 * saved.
 */
export async function submitCampaign({
  api,
  campaignId,
  body,
  photos,
  publish,
}: SubmitCampaignInput): Promise<SubmitCampaignResult> {
  const saved = campaignId
    ? await api.PATCH("/campaigns/{id}", {
        params: { path: { id: campaignId } },
        body,
      })
    : await api.POST("/campaigns", { body });
  if (!saved.data) {
    throw toApiError(saved.error, saved.response);
  }
  const id = saved.data.id;

  const failedImages: string[] = [];
  for (const [index, { newImages, removedImageIds }] of photos.entries()) {
    // A product of the round is a listing; its photos hang on that listing.
    const listingId = saved.data.items[index]?.id;
    if (!listingId) {
      failedImages.push(...newImages.map((file) => file.name));
      continue;
    }

    for (const imageId of removedImageIds) {
      await api.DELETE("/listings/{listingId}/images/{imageId}", {
        params: { path: { listingId, imageId } },
      });
    }

    for (const file of newImages) {
      const upload = await api.POST("/listings/{listingId}/images", {
        params: { path: { listingId } },
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
  }

  if (!publish || failedImages.length > 0) {
    return { id, failedImages, publishError: null, published: false };
  }

  const published = await api.POST("/campaigns/{id}/publish", {
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
