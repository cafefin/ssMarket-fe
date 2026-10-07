import { describe, expect, it } from "vitest";
import { MESSAGES } from "./messages";

type Tree = { [key: string]: string | Tree };

/** Every leaf as [dotted key, message]. */
function leaves(tree: Tree, prefix = ""): [string, string][] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "string" ? [[path, value]] : leaves(value, path);
  });
}

/**
 * The names of the arguments and rich-text tags a message uses. Words inside
 * plural branches ("{count, plural, one {# item} ...}") are not arguments.
 */
function argumentsOf(message: string): string[] {
  const names = new Set<string>();
  for (const match of message.matchAll(/\{\s*([A-Za-z]\w*)\s*[,}]/g)) {
    names.add(match[1]);
  }
  for (const match of message.matchAll(/<([A-Za-z]\w*)>/g)) {
    names.add(`<${match[1]}>`);
  }
  return [...names].sort();
}

const vi = new Map(leaves(MESSAGES.vi));
const en = new Map(leaves(MESSAGES.en));

describe("message files", () => {
  it("have the same keys in Vietnamese and English", () => {
    expect([...en.keys()].sort()).toEqual([...vi.keys()].sort());
  });

  it.each([...vi.keys()])(
    "%s uses the same arguments in both languages",
    (key) => {
      expect(argumentsOf(en.get(key) ?? "")).toEqual(
        argumentsOf(vi.get(key) ?? ""),
      );
    },
  );

  it("have no empty messages", () => {
    const empty = [...vi, ...en].filter(([, message]) => message.trim() === "");
    expect(empty).toEqual([]);
  });
});
