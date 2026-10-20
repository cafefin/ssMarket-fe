import { describe, expect, it } from "vitest";
import {
  chatSettingsSchema,
  toSettingsUpdate,
  WEBHOOK_PREFIX,
  type ChatSettingsValues,
} from "./chat-settings-schema";

const t = ((key: string) => key) as never;

const base: ChatSettingsValues = {
  enabled: true,
  unlimited: false,
  maxPerHour: "10",
  sellerCooldownMinutes: "5",
  webhookUrl: "",
  removeWebhook: false,
};

function issues(values: Partial<ChatSettingsValues>, stored = true) {
  const result = chatSettingsSchema(t, stored).safeParse({
    ...base,
    ...values,
  });
  return result.success
    ? []
    : result.error.issues.map((i) => `${i.path.join(".")}:${i.message}`);
}

describe("chatSettingsSchema", () => {
  it("accepts valid values", () => {
    expect(issues({})).toEqual([]);
  });

  it.each(["0", "61", "1,5", "", "abc"])("refuses maxPerHour %s", (v) => {
    expect(issues({ maxPerHour: v })).toEqual(["maxPerHour:maxPerHour"]);
  });

  it("ignores maxPerHour when unlimited", () => {
    expect(issues({ unlimited: true, maxPerHour: "0" })).toEqual([]);
  });

  it.each(["-1", "1441", "1.5", ""])("refuses cooldown %s", (v) => {
    expect(issues({ sellerCooldownMinutes: v })).toEqual([
      "sellerCooldownMinutes:cooldown",
    ]);
  });

  it("accepts cooldown 0", () => {
    expect(issues({ sellerCooldownMinutes: "0" })).toEqual([]);
  });

  it("refuses a webhook outside the prefix", () => {
    expect(issues({ webhookUrl: "https://example.com/x" })).toEqual([
      "webhookUrl:webhook",
    ]);
    expect(issues({ webhookUrl: `${WEBHOOK_PREFIX}A/messages?key=1` })).toEqual(
      [],
    );
  });

  it("needs a webhook to enable when none is stored", () => {
    expect(issues({}, false)).toEqual(["webhookUrl:webhookRequired"]);
    expect(issues({ enabled: false }, false)).toEqual([]);
    expect(
      issues({ webhookUrl: `${WEBHOOK_PREFIX}A/m` }, false),
    ).toEqual([]);
  });

  it("refuses enabling while removing the webhook", () => {
    expect(issues({ removeWebhook: true })).toEqual([
      "webhookUrl:webhookRequired",
    ]);
    expect(issues({ removeWebhook: true, enabled: false })).toEqual([]);
  });
});

describe("toSettingsUpdate", () => {
  it("maps numbers and leaves the webhook out when unchanged", () => {
    expect(toSettingsUpdate(base)).toEqual({
      enabled: true,
      maxPerHour: 10,
      sellerCooldownMinutes: 5,
    });
    expect("webhookUrl" in toSettingsUpdate(base)).toBe(false);
  });

  it("sends null for unlimited", () => {
    expect(toSettingsUpdate({ ...base, unlimited: true }).maxPerHour).toBeNull();
  });

  it("sends the trimmed new webhook", () => {
    expect(
      toSettingsUpdate({ ...base, webhookUrl: ` ${WEBHOOK_PREFIX}x ` })
        .webhookUrl,
    ).toBe(`${WEBHOOK_PREFIX}x`);
  });

  it("sends null when removing", () => {
    expect(
      toSettingsUpdate({ ...base, removeWebhook: true }).webhookUrl,
    ).toBeNull();
  });
});
