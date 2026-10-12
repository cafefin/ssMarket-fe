import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/api/api-error";
import {
  type CampaignInputBody,
  type ItemPhotos,
  submitCampaign,
} from "./submit-campaign";

const body = {
  title: "Bánh bao tuần này",
  items: [{ title: "Bánh bao chay" }, { title: "Chè" }],
} as unknown as CampaignInputBody;
const round = { id: "c1", items: [{ id: "i1" }, { id: "i2" }] };
const ok = (data: unknown = {}) => ({ data, response: new Response() });
const fail = (status: number, code: string) => ({
  error: { code, message: "backend text" },
  response: new Response(null, { status }),
});
const photo = (name: string) => new File(["x"], name, { type: "image/jpeg" });
const none = (): ItemPhotos => ({ newImages: [], removedImageIds: [] });

describe("submitCampaign", () => {
  const api = { POST: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() };
  const calls: string[] = [];

  /** Records the order of calls and answers with `responses[path]` or success. */
  function respond(responses: Record<string, unknown> = {}) {
    const handler =
      (method: string) =>
      (path: string, options?: { params?: { path?: Record<string, string> } }) => {
        const target = options?.params?.path?.listingId;
        calls.push(`${method} ${path}${target ? ` ${target}` : ""}`);
        return Promise.resolve(responses[`${method} ${path}`] ?? ok(round));
      };
    api.POST.mockImplementation(handler("POST"));
    api.PATCH.mockImplementation(handler("PATCH"));
    api.DELETE.mockImplementation(handler("DELETE"));
  }

  const submit = (overrides: Partial<Parameters<typeof submitCampaign>[0]> = {}) =>
    submitCampaign({
      api: api as never,
      body,
      photos: [none(), none()],
      publish: false,
      ...overrides,
    });

  beforeEach(() => {
    vi.resetAllMocks();
    calls.length = 0;
  });

  it("creates the round, uploads each product's photos to its listing, then publishes", async () => {
    respond();

    const result = await submit({
      photos: [
        { newImages: [photo("a.jpg"), photo("b.jpg")], removedImageIds: [] },
        { newImages: [photo("c.jpg")], removedImageIds: [] },
      ],
      publish: true,
    });

    expect(calls).toEqual([
      "POST /campaigns",
      "POST /listings/{listingId}/images i1",
      "POST /listings/{listingId}/images i1",
      "POST /listings/{listingId}/images i2",
      "POST /campaigns/{id}/publish",
    ]);
    expect(api.POST).toHaveBeenCalledWith("/campaigns", { body });
    expect(api.POST).toHaveBeenLastCalledWith("/campaigns/{id}/publish", {
      params: { path: { id: "c1" } },
    });
    expect(result).toEqual({
      id: "c1",
      failedImages: [],
      publishError: null,
      published: true,
    });
  });

  it("sends each photo as multipart form data", async () => {
    respond();
    const file = photo("a.jpg");

    await submit({ photos: [none(), { newImages: [file], removedImageIds: [] }] });

    const [, options] = api.POST.mock.calls[1] as [
      string,
      { params: unknown; bodySerializer: () => FormData },
    ];
    expect(options.params).toEqual({ path: { listingId: "i2" } });
    expect(options.bodySerializer().get("file")).toBe(file);
  });

  it("saves a draft without publishing", async () => {
    respond();

    const result = await submit();

    expect(calls).toEqual(["POST /campaigns"]);
    expect(result.published).toBe(false);
  });

  it("updates an existing round and removes photos before adding new ones", async () => {
    respond();

    await submit({
      campaignId: "c1",
      photos: [
        none(),
        { newImages: [photo("new.jpg")], removedImageIds: ["old-1", "old-2"] },
      ],
    });

    expect(calls).toEqual([
      "PATCH /campaigns/{id}",
      "DELETE /listings/{listingId}/images/{imageId} i2",
      "DELETE /listings/{listingId}/images/{imageId} i2",
      "POST /listings/{listingId}/images i2",
    ]);
    expect(api.PATCH).toHaveBeenCalledWith("/campaigns/{id}", {
      params: { path: { id: "c1" } },
      body,
    });
    expect(api.DELETE).toHaveBeenCalledWith(
      "/listings/{listingId}/images/{imageId}",
      { params: { path: { listingId: "i2", imageId: "old-1" } } },
    );
  });

  it("rejects when the round cannot be saved, and uploads nothing", async () => {
    respond({ "POST /campaigns": fail(422, "INVALID_CAMPAIGN") });

    const error = await submit({
      photos: [{ newImages: [photo("a.jpg")], removedImageIds: [] }, none()],
      publish: true,
    }).catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 422, code: "INVALID_CAMPAIGN" });
    expect(calls).toEqual(["POST /campaigns"]);
  });

  it("rejects with the conflict when a removed product has orders", async () => {
    respond({ "PATCH /campaigns/{id}": fail(409, "CAMPAIGN_ITEM_HAS_ORDERS") });

    await expect(submit({ campaignId: "c1" })).rejects.toMatchObject({
      status: 409,
      code: "CAMPAIGN_ITEM_HAS_ORDERS",
    });
  });

  it("reports a failed photo, keeps uploading the rest and does not publish", async () => {
    respond();
    let uploads = 0;
    api.POST.mockImplementation((path: string) => {
      calls.push(`POST ${path}`);
      if (path === "/listings/{listingId}/images") {
        uploads += 1;
        return Promise.resolve(uploads === 1 ? fail(422, "INVALID_IMAGE") : ok({}));
      }
      return Promise.resolve(ok(round));
    });

    const result = await submit({
      photos: [
        { newImages: [photo("broken.jpg")], removedImageIds: [] },
        { newImages: [photo("fine.jpg")], removedImageIds: [] },
      ],
      publish: true,
    });

    expect(result).toEqual({
      id: "c1",
      failedImages: ["broken.jpg"],
      publishError: null,
      published: false,
    });
    expect(calls).not.toContain("POST /campaigns/{id}/publish");
    expect(uploads).toBe(2);
  });

  it("reports the photos of a product the server did not answer with", async () => {
    respond({ "POST /campaigns": ok({ id: "c1", items: [{ id: "i1" }] }) });

    const result = await submit({
      photos: [none(), { newImages: [photo("lost.jpg")], removedImageIds: [] }],
      publish: true,
    });

    expect(result.failedImages).toEqual(["lost.jpg"]);
    expect(result.published).toBe(false);
    expect(calls).toEqual(["POST /campaigns"]);
  });

  it("returns the publish error while keeping the saved round", async () => {
    respond({ "POST /campaigns/{id}/publish": fail(422, "BANK_PROFILE_REQUIRED") });

    const result = await submit({ publish: true });

    expect(result.id).toBe("c1");
    expect(result.published).toBe(false);
    expect(result.publishError).toMatchObject({
      status: 422,
      code: "BANK_PROFILE_REQUIRED",
    });
  });
});
