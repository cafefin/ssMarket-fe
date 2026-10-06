import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/api/api-error";
import type { ListingInputBody } from "./listing-schema";
import { submitListing } from "./submit-listing";

const body = { mode: "in_stock", title: "Loa cũ" } as unknown as ListingInputBody;
const ok = (data: unknown = {}) => ({ data, response: new Response() });
const fail = (status: number, code: string) => ({
  error: { code, message: "backend text" },
  response: new Response(null, { status }),
});
const photo = (name: string) => new File(["x"], name, { type: "image/jpeg" });

describe("submitListing", () => {
  const api = { POST: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() };
  const calls: string[] = [];

  /** Records the order of calls and answers with `responses[path]` or success. */
  function respond(responses: Record<string, unknown> = {}) {
    const handler = (method: string) => (path: string) => {
      calls.push(`${method} ${path}`);
      return Promise.resolve(responses[`${method} ${path}`] ?? ok({ id: "l1" }));
    };
    api.POST.mockImplementation(handler("POST"));
    api.PATCH.mockImplementation(handler("PATCH"));
    api.DELETE.mockImplementation(handler("DELETE"));
  }

  const submit = (overrides: Partial<Parameters<typeof submitListing>[0]> = {}) =>
    submitListing({
      api: api as never,
      body,
      newImages: [],
      removedImageIds: [],
      publish: false,
      ...overrides,
    });

  beforeEach(() => {
    vi.resetAllMocks();
    calls.length = 0;
  });

  it("creates, uploads photos in order, then publishes", async () => {
    respond();

    const result = await submit({
      newImages: [photo("a.jpg"), photo("b.jpg")],
      publish: true,
    });

    expect(calls).toEqual([
      "POST /listings",
      "POST /listings/{listingId}/images",
      "POST /listings/{listingId}/images",
      "POST /listings/{id}/publish",
    ]);
    expect(result).toEqual({
      id: "l1",
      failedImages: [],
      publishError: null,
      published: true,
    });
  });

  it("sends each photo as multipart form data", async () => {
    respond();
    const file = photo("a.jpg");

    await submit({ newImages: [file] });

    const [, options] = api.POST.mock.calls[1] as [
      string,
      { params: unknown; bodySerializer: () => FormData },
    ];
    expect(options.params).toEqual({ path: { listingId: "l1" } });
    expect(options.bodySerializer().get("file")).toBe(file);
  });

  it("saves a draft without publishing", async () => {
    respond();

    const result = await submit();

    expect(calls).toEqual(["POST /listings"]);
    expect(result.published).toBe(false);
  });

  it("updates an existing listing and removes photos before adding new ones", async () => {
    respond();

    await submit({
      listingId: "l1",
      removedImageIds: ["old-1"],
      newImages: [photo("new.jpg")],
    });

    expect(calls).toEqual([
      "PATCH /listings/{id}",
      "DELETE /listings/{listingId}/images/{imageId}",
      "POST /listings/{listingId}/images",
    ]);
    expect(api.PATCH).toHaveBeenCalledWith("/listings/{id}", {
      params: { path: { id: "l1" } },
      body,
    });
    expect(api.DELETE).toHaveBeenCalledWith(
      "/listings/{listingId}/images/{imageId}",
      { params: { path: { listingId: "l1", imageId: "old-1" } } },
    );
  });

  it("rejects when the listing cannot be saved, and uploads nothing", async () => {
    respond({ "POST /listings": fail(422, "BANK_PROFILE_REQUIRED") });

    const error = await submit({ newImages: [photo("a.jpg")], publish: true }).catch(
      (reason: unknown) => reason,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 422, code: "BANK_PROFILE_REQUIRED" });
    expect(calls).toEqual(["POST /listings"]);
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
      return Promise.resolve(ok({ id: "l1" }));
    });

    const result = await submit({
      newImages: [photo("broken.jpg"), photo("fine.jpg")],
      publish: true,
    });

    expect(result).toEqual({
      id: "l1",
      failedImages: ["broken.jpg"],
      publishError: null,
      published: false,
    });
    expect(calls).not.toContain("POST /listings/{id}/publish");
    expect(uploads).toBe(2);
  });

  it("returns the publish error while keeping the saved listing", async () => {
    respond({ "POST /listings/{id}/publish": fail(400, "BAD_REQUEST") });

    const result = await submit({ publish: true });

    expect(result.id).toBe("l1");
    expect(result.published).toBe(false);
    expect(result.publishError).toMatchObject({ status: 400, code: "BAD_REQUEST" });
  });
});
