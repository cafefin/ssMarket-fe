import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/shared/i18n/test-utils";
import type { Cell } from "../lib/parse-item-rows";
import { ImportItemsButton } from "./import-items-button";

const { readXlsx } = vi.hoisted(() => ({ readXlsx: vi.fn() }));
vi.mock("../lib/read-xlsx", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/read-xlsx")>()),
  readXlsx,
}));

const HEADER: Cell[] = ["Tên", "Giá", "Đơn vị", "Mô tả"];
const file = (name = "mon.xlsx", size = 100) => {
  const chosen = new File(["x"], name);
  Object.defineProperty(chosen, "size", { value: size });
  return chosen;
};

describe("ImportItemsButton", () => {
  const onImport = vi.fn();
  const onSummary = vi.fn();

  const renderButton = (props: Partial<Parameters<typeof ImportItemsButton>[0]> = {}) =>
    renderWithIntl(
      <ImportItemsButton
        defaultUnit={() => "cái"}
        room={() => 50}
        onImport={onImport}
        onSummary={onSummary}
        {...props}
      />,
    );
  const choose = (chosen: File) =>
    fireEvent.change(screen.getByLabelText("Chọn file Excel (.xlsx)"), {
      target: { files: [chosen] },
    });

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("links to the template as a download", () => {
    renderButton();

    const link = screen.getByRole("link", { name: "Tải file mẫu" });
    expect(link).toHaveAttribute("href", "/templates/campaign-items.xlsx");
    expect(link).toHaveAttribute("download");
  });

  it("opens the file chooser from the button, which accepts .xlsx only", async () => {
    renderButton();
    const input = screen.getByLabelText("Chọn file Excel (.xlsx)");
    expect(input).toHaveAttribute("accept", ".xlsx");
    const open = vi.spyOn(input, "click");

    await userEvent.click(screen.getByRole("button", { name: "Nhập từ Excel" }));

    expect(open).toHaveBeenCalled();
  });

  it("hands over the products of the file and says how many were added", async () => {
    readXlsx.mockResolvedValue([
      HEADER,
      ["Bánh bao chay", 15000, null, null],
      ["Bánh bao thịt", 18000, "hộp", "Nóng"],
      ["Sữa đậu nành", "12.000", "bottle", "330 ml"],
    ]);
    renderButton();

    choose(file());

    await waitFor(() => expect(onImport).toHaveBeenCalledTimes(1));
    const items = onImport.mock.calls[0][0];
    expect(items.map((item: { title: string; unit: string }) => [item.title, item.unit])).toEqual([
      ["Bánh bao chay", "cái"],
      ["Bánh bao thịt", "hộp"],
      ["Sữa đậu nành", "chai"],
    ]);
    expect(onSummary).toHaveBeenCalledWith("Đã thêm 3 món");
  });

  it("says how many of the added products need fixing", async () => {
    readXlsx.mockResolvedValue([
      HEADER,
      ["Bánh bao chay", 15000, null, null],
      ["Chè", "abc", null, null],
      ["", 15000, null, null],
    ]);
    renderButton();

    choose(file());

    await waitFor(() =>
      expect(onSummary).toHaveBeenCalledWith("Đã thêm 3 món, 2 món cần sửa"),
    );
    expect(onImport.mock.calls[0][0]).toHaveLength(3);
  });

  it("mentions products whose unit was not recognised", async () => {
    readXlsx.mockResolvedValue([HEADER, ["Bánh", 15000, "thùng", null]]);
    renderButton();

    choose(file());

    await waitFor(() =>
      expect(onSummary).toHaveBeenCalledWith(
        "Đã thêm 1 món, 1 món có đơn vị lạ nên dùng đơn vị mặc định",
      ),
    );
  });

  it("says how many rows were dropped for the limit", async () => {
    readXlsx.mockResolvedValue([
      HEADER,
      ["Bánh 1", 15000, null, null],
      ["Bánh 2", 15000, null, null],
      ["Bánh 3", 15000, null, null],
    ]);
    renderButton({ room: () => 1 });

    choose(file());

    await waitFor(() =>
      expect(onSummary).toHaveBeenCalledWith("Đã thêm 1 món, bỏ 2 dòng vì vượt 50 món"),
    );
    expect(onImport.mock.calls[0][0]).toHaveLength(1);
  });

  it("says the round is full when there is no room at all", async () => {
    readXlsx.mockResolvedValue([HEADER, ["Bánh", 15000, null, null]]);
    renderButton({ room: () => 0 });

    choose(file());

    await waitFor(() =>
      expect(onSummary).toHaveBeenCalledWith("Đã đủ 50 món, không nhập thêm được."),
    );
    expect(onImport).not.toHaveBeenCalled();
  });

  it("refuses a .csv file without reading it", async () => {
    renderButton();

    choose(file("mon.csv"));

    await waitFor(() =>
      expect(onSummary).toHaveBeenCalledWith(
        "Chỉ nhận file .xlsx. Hãy tải file mẫu và điền vào đó.",
      ),
    );
    expect(readXlsx).not.toHaveBeenCalled();
    expect(onImport).not.toHaveBeenCalled();
  });

  it("refuses a file over 1 MB", async () => {
    renderButton();

    choose(file("mon.xlsx", 2 * 1024 * 1024));

    await waitFor(() =>
      expect(onSummary).toHaveBeenCalledWith("File lớn hơn 1 MB nên không nhập được."),
    );
    expect(readXlsx).not.toHaveBeenCalled();
    expect(onImport).not.toHaveBeenCalled();
  });

  it("says so when the file cannot be read", async () => {
    readXlsx.mockRejectedValue(new Error("zip"));
    renderButton();

    choose(file());

    await waitFor(() =>
      expect(onSummary).toHaveBeenCalledWith(
        "Không đọc được file này. Hãy dùng file mẫu.",
      ),
    );
    expect(onImport).not.toHaveBeenCalled();
  });

  it("says so when the file has no data rows", async () => {
    readXlsx.mockResolvedValue([HEADER, [null, null, null, null]]);
    renderButton();

    choose(file());

    await waitFor(() =>
      expect(onSummary).toHaveBeenCalledWith("File không có dòng dữ liệu nào để nhập."),
    );
    expect(onImport).not.toHaveBeenCalled();
  });

  it("lets the same file be chosen again", async () => {
    readXlsx.mockResolvedValue([HEADER, ["Bánh", 15000, null, null]]);
    renderButton();
    const input = screen.getByLabelText("Chọn file Excel (.xlsx)") as HTMLInputElement;

    choose(file());
    await waitFor(() => expect(onImport).toHaveBeenCalled());

    expect(input.value).toBe("");
  });

  it("speaks English", async () => {
    readXlsx.mockResolvedValue([HEADER, ["Bun", 15000, "bottle", null]]);
    renderWithIntl(
      <ImportItemsButton defaultUnit={() => "cái"} room={() => 50} onImport={onImport} onSummary={onSummary} />,
      { locale: "en" },
    );

    expect(screen.getByRole("button", { name: "Import from Excel" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Choose an Excel file (.xlsx)"), {
      target: { files: [file()] },
    });

    await waitFor(() => expect(onSummary).toHaveBeenCalledWith("Added 1 product"));
  });
});
