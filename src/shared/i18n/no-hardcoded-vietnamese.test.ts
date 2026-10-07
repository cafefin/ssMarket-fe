import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(process.cwd(), "src");

// Text people read lives in messages/vi.json and messages/en.json. Tests may
// assert Vietnamese text; the generated API types carry backend examples; the
// selling units are stored data, shown as written in both languages.
const ALLOWED = [
  /\.test\.tsx?$/,
  /^shared\/api\/schema\.d\.ts$/,
  /^shared\/i18n\/messages\//,
  /^features\/sell\/lib\/units\.ts$/,
];

// Letters that only Vietnamese uses among the languages we write code in:
// đ and the vowels with a tone mark, a breve, a horn or a circumflex.
const VIETNAMESE =
  /[đĐăĂâÂêÊôÔơƠưƯàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵÀÁẢÃẠẰẮẲẴẶẦẤẨẪẬÈÉẺẼẸỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌỒỐỔỖỘỜỚỞỠỢÙÚỦŨỤỪỨỬỮỰỲÝỶỸỴ]/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return sourceFiles(path);
    }
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

describe("source files", () => {
  it("keep Vietnamese text in the message files", () => {
    const found = sourceFiles(SRC)
      .map((path) => relative(SRC, path).split(sep).join("/"))
      .filter((path) => !ALLOWED.some((pattern) => pattern.test(path)))
      .flatMap((path) =>
        readFileSync(join(SRC, path), "utf8")
          .split("\n")
          .flatMap((line, index) =>
            VIETNAMESE.test(line)
              ? [`src/${path}:${index + 1}: ${line.trim()}`]
              : [],
          ),
      );

    expect(found).toEqual([]);
  });
});
